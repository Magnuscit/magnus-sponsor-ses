import { NextResponse } from 'next/server'
import * as AWS from 'aws-sdk'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'


AWS.config.update({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	region: process.env.AWS_REGION
})

const ses = new AWS.SES({ apiVersion: '2010-12-01' })

export async function POST(request: Request) {
	try {

		const token = cookies().get('auth_token')?.value
		if (!token) {
			return NextResponse.json({
				success: false,
				message: 'Unauthorized'
			}, { status: 401 })
		}

		try {
			verify(token, JWT_SECRET)
		} catch (error) {
			return NextResponse.json({
				success: false,
				message: 'Invalid token'
			}, { status: 401 })
		}

		const { subject, body, recipients } = await request.json()

		const emailPromises = recipients.map(async (values: string[]) => {
			let modifiedBody = body
			values.forEach((value, idx) => {
				const placeholder = new RegExp(`\\$\\{${idx}\\}`, 'g')
				modifiedBody = modifiedBody.replace(placeholder, value)
			})

			const params = {
				Source: process.env.SES_VERIFIED_EMAIL!,
				Destination: {
					ToAddresses: [values[0]]
				},
				Message: {
					Subject: {
						Data: subject
					},
					Body: {
						Html: {
							Data: `
                <html>
                  <head>
                    <title>${subject}</title>
                  </head>
                  <body>
                    ${modifiedBody}
                  </body>
                </html>
              `
						}
					}
				}
			}

			return ses.sendEmail(params).promise()
		})

		await Promise.all(emailPromises)

		return NextResponse.json({
			success: true,
			message: 'Emails sent successfully'
		})
	} catch (error) {
		console.error('Error sending emails:', error)
		return NextResponse.json({
			success: false,
			message: 'Error sending emails',
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 })
	}
}
