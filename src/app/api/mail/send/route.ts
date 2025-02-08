import { NextResponse } from "next/server";
import * as AWS from "aws-sdk";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { promises as fs } from "fs";
import path from "path";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const ATTACHMENT_NAME = "brochure.png";

const ses = new AWS.SES({ apiVersion: "2010-12-01" });

export async function POST(request: Request) {
  try {
    // @ts-ignore
    const token = (await cookies()).get("auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 },
      );
    }

    try {
      verify(token, JWT_SECRET);
    } catch (_) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid token",
        },
        { status: 401 },
      );
    }

    const { subject, body, recipients } = await request.json();

    const filePath = path.join(process.cwd(), "public", ATTACHMENT_NAME);
    const fileBuffer = await fs.readFile(filePath);
    const attachmentBase64 = fileBuffer.toString("base64");

    const emailPromises = recipients.map(async (values: string[]) => {
      let modifiedBody = body;
      values.forEach((value, idx) => {
        const placeholder = new RegExp(`\\$\\{${idx}\\}`, "g");
        modifiedBody = modifiedBody.replace(placeholder, value);
      });

      const plainText = `Hello,

${modifiedBody}

Best regards,
Team Magnus
CSE-AIML
Chennai Institute of Technology`;

      const htmlContent = `<html>
  <head>
    <title>${subject}</title>
  </head>
  <body>
   <div style="box-sizing: border-box; background: gray; padding: 3%;">
      <table id="content" colspan="4" style="background: white; width: 100%">
         <tr style="height: 15vh">
            <td>&nbsp;</td>
            <td colspan="2" align="center">
               <img src="https://ik.imagekit.io/lovelin/magnus%20mail.png?updatedAt=1738836507322" alt="logo"/>
            </td>
            <td>&nbsp;</td>
         </tr>
         <tr style="font-size: 1.2em">
            <td colspan="4" style="font-family: monospace; vertical-align: center; padding: 2em">
               <p>
                  ${modifiedBody}
                  <br><br>
                  Best regards,  
                  <br>
                  Team Magnus 
                  <br>
                  CSE-AIML
                  <br>
                  Chennai Institute of Technology
               </p>
            </td>
         </tr>
         <tr style="vertical-align: top">
            <td style="font-family: monospace; vertical-align: middle; padding: 2em; width: 25%;">
               <div style="text-align: justify">
                  <p style="margin: 4px"><b>Contact</b></p>
                  <p style="margin: 2px">9566189965</p>
                  <p style="margin: 2px">8248493521</p>
               </div>
            </td>
            <td style="font-family: monospace; vertical-align: middle; padding: 2em; width: 25%;">
               <div style="text-align: justify">
                  <p style="margin: 4px"><b>Email</b></p>
                  <p style="margin: 2px"><a href="mailto:magnus@citchennai.net">magnus@citchennai.net</a></p>
               </div>
            </td>
            <td style="font-family: monospace; vertical-align: middle; padding: 2em; width: 25%;">
               <div style="text-align: justify">
                  <p style="margin: 4px"><b>Visit Us</b></p>
                  <p style="margin: 2px"><a href="https://magnuscit.live">www.magnuscit.live</a></p>
               </div>
            </td>
            <td style="font-family: monospace; vertical-align: middle; padding: 2em; width: 25%;">
               <p style="margin: 4px"><b>Socials</b></p>
               <div style="display: flex; justify-content: left; margin: 4px; text-align: justify;">
                  <a href="https://www.linkedin.com/in/magnus-cit-7158a2287">
                    <img alt="LinkedIn" src="https://www.shareicon.net/data/2015/09/28/108616_media_512x512.png" style="width: 15px; height: 15px; padding: 2px"/>
                  </a>
                  <a href="https://www.instagram.com/magnus.cit">
                    <img alt="Instagram" src="https://raw.githubusercontent.com/cittakshashila/backend/ses/docs/asserts/insta.png" style="width: 15px; height: 15px; padding: 2px"/>
                  </a>
               </div>
            </td>
         </tr>
         <tr>
            <td colspan="4" style="font-family: monospace; vertical-align: center; padding: 2em">
               <p style="text-align: center">
                  © 2025 Magnus. All rights reserved.
               </p>
            </td>
         </tr>
      </table>
   </div>
  </body>
</html>`;

      const boundaryMixed = "NextPartMixedBoundary";
      const boundaryAlternative = "NextPartAlternativeBoundary";

      const rawEmail = [
        `From: ${process.env.SES_VERIFIED_EMAIL}`,
        `To: ${values[0]}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundaryMixed}"`,
        ``,
        `--${boundaryMixed}`,
        `Content-Type: multipart/alternative; boundary="${boundaryAlternative}"`,
        ``,
        `--${boundaryAlternative}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        `Content-Transfer-Encoding: 7bit`,
        ``,
        plainText,
        ``,
        `--${boundaryAlternative}`,
        `Content-Type: text/html; charset="UTF-8"`,
        `Content-Transfer-Encoding: 7bit`,
        ``,
        htmlContent,
        ``,
        `--${boundaryAlternative}--`,
        ``,
        `--${boundaryMixed}`,
        `Content-Type: image/png; name="${ATTACHMENT_NAME}"`,
        `Content-Disposition: attachment; filename="${ATTACHMENT_NAME}"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        attachmentBase64,
        ``,
        `--${boundaryMixed}--`,
      ].join("\n");

      const params = {
        Source: process.env.SES_VERIFIED_EMAIL,
        Destinations: [values[0]],
        RawMessage: { Data: rawEmail },
      };

      return ses.sendRawEmail(params).promise();
    });

    await Promise.allSettled(emailPromises);
    return NextResponse.json({
      success: true,
      message: "Emails sent successfully",
    });
  } catch (error) {
    console.error("Error sending emails:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error sending emails",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
