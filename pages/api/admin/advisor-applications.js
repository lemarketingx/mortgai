import { hasAdminSession } from "../../../lib/adminAuth";
import { LeadStoreError, readAdvisorApplications, updateAdvisorApplication, createAdvisor, readAdvisors } from "../../../lib/leadsStore";
import { hashPassword } from "../../../lib/advisorAuth";
import { randomUUID } from "crypto";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  try {
    if (!hasAdminSession(req)) return apiError(res, 401, "ADMIN_AUTH_REQUIRED", "Admin session required");
  } catch (err) {
    return apiError(res, 500, "ADMIN_AUTH_NOT_CONFIGURED", err.message);
  }

  if (req.method === "GET") {
    try {
      const applications = await readAdvisorApplications();
      return res.status(200).json({ applications });
    } catch (err) {
      const status = err instanceof LeadStoreError && err.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
      return apiError(res, status, err.code || "READ_FAILED", err.message);
    }
  }

  if (req.method === "PATCH") {
    const body = req.body || {};
    const id = String(body.id || "").trim();
    const action = String(body.action || "").trim(); // "approve" | "reject" | "notes"
    const adminNotes = String(body.adminNotes || "").trim().slice(0, 500);

    if (!id) return apiError(res, 400, "MISSING_ID", "id is required");
    if (!["approve", "reject", "notes"].includes(action)) {
      return apiError(res, 400, "INVALID_ACTION", "action must be approve, reject, or notes");
    }

    try {
      if (action === "notes") {
        const updated = await updateAdvisorApplication(id, { adminNotes });
        return res.status(200).json({ ok: true, application: updated });
      }

      if (action === "reject") {
        const updated = await updateAdvisorApplication(id, { status: "rejected", adminNotes: adminNotes || undefined });
        return res.status(200).json({ ok: true, application: updated });
      }

      // action === "approve"
      const tempPassword = String(body.tempPassword || "").trim();
      if (!tempPassword || tempPassword.length < 6) {
        return apiError(res, 400, "MISSING_TEMP_PASSWORD", "tempPassword (min 6 chars) is required for approval");
      }

      // Read the application to get advisor details
      const applications = await readAdvisorApplications();
      const app = applications.find((a) => a.id === id);
      if (!app) return apiError(res, 404, "APPLICATION_NOT_FOUND", "Application not found");
      if (app.status === "approved") return apiError(res, 409, "ALREADY_APPROVED", "Application already approved");

      // Ensure email uniqueness among existing advisors
      const existing = await readAdvisors();
      const emailTaken = existing.some((a) => String(a.email || "").toLowerCase() === String(app.email || "").toLowerCase());
      if (emailTaken && app.email) {
        return apiError(res, 409, "EMAIL_EXISTS", "An advisor with this email already exists");
      }

      const advisorId = `adv_${randomUUID().slice(0, 8)}`;
      const passwordHash = hashPassword(tempPassword);

      await createAdvisor({
        advisorId,
        name: app.fullName,
        phone: app.phone,
        email: app.email,
        active: true,
        commissionType: "lead",
        commissionAmount: app.region || "",
        passwordHash,
      });

      const updated = await updateAdvisorApplication(id, {
        status: "approved",
        adminNotes: adminNotes || undefined,
      });

      return res.status(200).json({ ok: true, advisorId, application: updated });
    } catch (err) {
      const status = err instanceof LeadStoreError && err.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
      return apiError(res, status, err.code || "UPDATE_FAILED", err.message);
    }
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
