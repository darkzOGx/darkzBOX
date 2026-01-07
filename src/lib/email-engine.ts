import nodemailer from 'nodemailer';
import { EmailAccount } from '@prisma/client';

export async function sendEmailViaAccount(account: EmailAccount, email: { to: string, subject: string, html: string }): Promise<string> {
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

    const info = await transporter.sendMail({
        from: `"${account.name || account.email}" <${account.email}>`,
        to: email.to,
        subject: email.subject,
        html: email.html,
    });

    console.log(`[SMTP] Sent email from ${account.email} to ${email.to}. MessageID: ${info.messageId}`);
    return info.messageId;
}

