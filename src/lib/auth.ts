import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
    // @ts-ignore - trustHost is valid in NextAuth v4 but generic types might miss it
    trustHost: true,
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (credentials?.username === "admin" && credentials?.password === "b2ab1") {
                    return {
                        id: "admin",
                        name: "Admin",
                        email: "admin@darkzbox.com",
                    };
                }
                return null;
            }
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://mail.google.com/",
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
            }
            return session;
        },
        async signIn({ user, account, profile }) {
            // Allow credentials provider to sign in without any DB checks
            if (account?.provider === "credentials") {
                return true;
            }

            if (account?.provider === "google") {
                // Intercept the sign-in to create/update the EmailAccount
                // We are using NextAuth purely as a "Connect Account" mechanism here

                const workspace = await prisma.workspace.findFirst(); // Default workspace
                if (!workspace) {
                    console.error("No workspace found for Google OAuth");
                    return "/settings?error=NoWorkspace";
                }

                // Upsert the EmailAccount based on the email
                await prisma.emailAccount.upsert({
                    where: {
                        // We don't have a unique constraint on email alone globally in DB schema yet suitable for this, 
                        // but assuming 1 email = 1 account for now.
                        // Actually `id` is primary key, but we want to find by email AND workspace logic usually.
                        // Since we don't have a unique key on email, we use findFirst -> update or create.
                        id: "placeholder" // Prisma upsert requires a unique field. We'll simulate upsert below.
                    },
                    update: {},
                    create: {
                        workspaceId: workspace.id,
                        email: user.email!,
                        name: user.name,
                        provider: "GMAIL",
                        smtpHost: "smtp.gmail.com",
                        smtpPort: 587,
                        smtpUser: user.email!, // Username for SMTP is email
                        smtpPass: "", // Password unused for OAuth
                        imapHost: "imap.gmail.com",
                        imapPort: 993,
                        imapUser: user.email!,
                        accessToken: account.access_token,
                        refreshToken: account.refresh_token,
                        expiresAt: account.expires_at,
                        tokenType: account.token_type,
                        idToken: account.id_token
                    }
                }).catch(async (e) => {
                    // Fallback to manual find-and-update or create because of the `where` limitation above
                    const existing = await prisma.emailAccount.findFirst({
                        where: { email: user.email!, workspaceId: workspace.id }
                    });

                    if (existing) {
                        await prisma.emailAccount.update({
                            where: { id: existing.id },
                            data: {
                                accessToken: account.access_token,
                                refreshToken: account.refresh_token, // Only updates if provided
                                expiresAt: account.expires_at,
                            }
                        });
                    } else {
                        await prisma.emailAccount.create({
                            data: {
                                workspaceId: workspace.id,
                                email: user.email!,
                                name: user.name,
                                provider: "GMAIL",
                                smtpHost: "smtp.gmail.com",
                                smtpPort: 587,
                                smtpUser: user.email!,
                                smtpPass: "",
                                imapHost: "imap.gmail.com",
                                imapPort: 993,
                                imapUser: user.email!,
                                accessToken: account.access_token,
                                refreshToken: account.refresh_token,
                                expiresAt: account.expires_at,
                                tokenType: account.token_type,
                                idToken: account.id_token
                            }
                        });
                    }
                });

                return true; // Return true to allow the "sign in" to complete (even though we ignore the session mostly)
            }
            return true;
        },
        async redirect({ url, baseUrl }) {
            // If signing in with credentials, go to dashboard
            if (url === baseUrl || url === baseUrl + "/login") {
                return baseUrl + "/";
            }
            // For Google OAuth, redirect to settings
            if (url.includes("/api/auth/callback/google")) {
                return baseUrl + "/settings";
            }
            return url.startsWith(baseUrl) ? url : baseUrl + "/";
        }
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: "jwt",
    },
};
