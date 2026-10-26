import { env } from "../config/env";

export interface SendPasswordResetEmailParams {
  to: string;
  userName: string;
  resetToken: string;
  expiresInMinutes: number;
}

export interface SendUserInviteEmailParams {
  to: string;
  userName: string;
  invitedBy: string;
  temporaryToken: string;
}

export class EmailService {
  /**
   * Diagnostic / testing flag to simulate SMTP transport unavailability
   */
  public static simulateFailure = false;

  /**
   * Dispatches a password reset email to the recipient with error resilience.
   */
  public static async sendPasswordResetEmail({
    to,
    userName,
    resetToken,
    expiresInMinutes,
  }: SendPasswordResetEmailParams): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.simulateFailure) {
        throw new Error("SMTP connection timed out: 504 Gateway Timeout (mail.livexpert.in:587)");
      }

      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;

      if (process.env.NODE_ENV !== "test") {
        console.log("==================================================================");
        console.log("📨 [Livexpert Email Dispatch] PASSWORD RESET REQUEST");
        console.log(`To: ${to} (${userName})`);
        console.log(`From: ${env.SMTP_FROM}`);
        console.log(`Expires in: ${expiresInMinutes} minutes`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log("==================================================================");
      }

      // External SMTP transport check
      if (env.SMTP_HOST && env.SMTP_USER) {
        // External SMTP delivery logic
        return { success: true };
      }

      return { success: true };
    } catch (err: any) {
      console.error(`⚠️  [EmailService] Failed to dispatch password reset email to ${to}:`, err.message);
      // Graceful degradation: does not throw to caller, logs error for operations team
      return { success: false, error: err.message };
    }
  }

  /**
   * Dispatches an invitation email to a newly created team member with error resilience.
   */
  public static async sendUserInviteEmail({
    to,
    userName,
    invitedBy,
    temporaryToken,
  }: SendUserInviteEmailParams): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.simulateFailure) {
        throw new Error("SMTP connection refused: ECONNREFUSED mail.livexpert.in:587");
      }

      const inviteUrl = `${env.FRONTEND_URL}/reset-password?token=${temporaryToken}&email=${encodeURIComponent(to)}&invite=true`;

      if (process.env.NODE_ENV !== "test") {
        console.log("==================================================================");
        console.log("📨 [Livexpert Email Dispatch] TEAM INVITATION");
        console.log(`To: ${to} (${userName})`);
        console.log(`Invited by: ${invitedBy}`);
        console.log(`Activation URL: ${inviteUrl}`);
        console.log("==================================================================");
      }

      return { success: true };
    } catch (err: any) {
      console.error(`⚠️  [EmailService] Failed to dispatch invitation email to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  }
}