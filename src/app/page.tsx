"use client";

import { useState, useEffect } from "react";
import { parse } from "papaparse";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

export default function BulkMailer() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check");
        const data = await response.json();
        if (data.success) {
          setIsLoggedIn(true);
        }
      } catch (_) {
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, password }),
      });

      const data = await response.json();

      if (data.success) {
        setIsLoggedIn(true);
      } else {
        setLoginError(data.message || "Invalid credentials");
      }
    } catch (_) {
      setLoginError("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!subject || !body || !file) {
      alert("Please fill all fields");
      return;
    }

    if (!confirm) {
      setConfirm(true);
      return;
    }

    setConfirm(false);
    setSending(true);

    parse(file, {
      skipEmptyLines: true,
      complete: async function (results) {
        const emails = (results.data as Array<Array<string>>).map((row) =>
          row.filter((cell) => !!cell),
        );

        const batchSize = 40;
        const _ = Math.ceil(emails.length / batchSize);

        for (let i = 0; i < emails.length; i += batchSize) {
          const batch = emails.slice(i, i + batchSize);
          try {
            await fetch("/api/mail/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subject,
                body,
                recipients: batch,
              }),
            });
            setProgress(((i + batchSize) / emails.length) * 100);
          } catch (error) {
            console.error("Error sending batch:", error);
          }
        }

        setSending(false);
        setProgress(0);
        alert("All emails sent successfully!");
      },
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Enter your credentials to access the email sender
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <Alert variant="destructive">
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="User ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Bulk Email Sender</CardTitle>
          <CardDescription>
            Send emails in batches using Amazon SES
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {confirm && (
            <Alert className="mb-4">
              <AlertTitle>Confirm Send</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>Are you sure you want to send these emails?</p>
                <div className="space-x-2">
                  <Button onClick={handleSubmit}>Yes, send</Button>
                  <Button variant="outline" onClick={() => setConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Input
              placeholder="Email Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Email Body (supports ${0}, ${1}, etc. for variables)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {sending && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-gray-500 text-center">
                Sending emails... {Math.round(progress)}%
              </p>
            </div>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={sending}>
            {sending ? "Sending..." : "Send Emails"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
