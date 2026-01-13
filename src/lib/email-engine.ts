import nodemailer from 'nodemailer';
import { EmailAccount } from '@prisma/client';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    // Threading headers for replies
    inReplyTo?: string;
    references?: string;
}

export async function sendEmailViaAccount(account: EmailAccount, email: EmailOptions): Promise<string> {
    let transportConfig: any = {
        host: account.smtpHost,
        port: account.smtpPort,
        secure: account.smtpPort === 465,
    };

    if (account.accessToken && account.refreshToken) {
        // OAuth2 Configuration
        transportConfig.auth = {
            type: 'OAuth2',
            user: account.email,
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            refreshToken: account.refreshToken,
            accessToken: account.accessToken,
        };
    } else {
        // Password Configuration
        transportConfig.auth = {
            user: account.smtpUser,
            pass: account.smtpPass,
        };
    }

    const transporter = nodemailer.createTransport(transportConfig);

    // Build mail options with threading support
    const mailOptions: any = {
        from: `"${account.name || account.email}" <${account.email}>`,
        to: email.to,
        subject: email.subject,
        html: email.html,
    };

    // Add threading headers if replying to an existing message
    if (email.inReplyTo) {
        mailOptions.inReplyTo = email.inReplyTo;
        mailOptions.references = email.references || email.inReplyTo;
        console.log(`[SMTP] Replying to thread: ${email.inReplyTo}`);
    }

    const info = await transporter.sendMail(mailOptions);

    console.log(`[SMTP] Sent email from ${account.email} to ${email.to}. MessageID: ${info.messageId}`);
    return info.messageId;
}

