import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
    try {
        const config = await req.json();

        const transporter = nodemailer.createTransport({
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpPort === 465,
            auth: {
                user: config.smtpUser,
                pass: config.smtpPass
            },
            tls: config.useTls ? { rejectUnauthorized: false } : undefined
        });

        // Verify connection
        await transporter.verify();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('SMTP test failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Connection failed'
        });
    }
}
