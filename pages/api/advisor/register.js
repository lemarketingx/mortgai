import { randomUUID } from "crypto";
import { supabaseAdminCreateUser } from "../../../lib/supabaseAuth";
import { createAdvisor, readAdvisors } from "../../../lib/leadsStore";
import { createAdvisorSessionCookie } from "../../../lib/advisorAuth";

function err(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return err(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");

  const body = req.body || {};
  const fullName = String(body.fullName || "").trim();
  const phone = String(body.phone || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const region = String(body.region || "").trim().slice(0, 120);
  const advisorType = String(body.advisorType || "").trim().slice(0, 80);
  const businessName = String(body.businessName || "").trim().slice(0, 120);

  if (fullName.length < 2) return err(res, 400, "VALIDATION_ERROR", "שם מלא הוא שדה חובה (לפחות 2 תווים)");
  if (phone.length < 9) return err(res, 400, "VALIDATION_ERROR", "טלפון תקין הוא שדה חובה");
  if (!email || !email.includes("@")) return err(res, 400, "VALIDATION_ERROR", "יש להזין כתובת אימייל תקינה");
  if (password.length < 8) return err(res, 400, "VALIDATION_ERROR", "הסיסמה חייבת להכיל לפחות 8 תווים");
  if (!body.terms) return err(res, 400, "VALIDATION_ERROR", "יש לאשר את תנאי השימוש");

  // Check for duplicate email in our advisors table before hitting Supabase
  try {
    const existing = await readAdvisors();
    if (existing.some((a) => String(a.email || "").toLowerCase() === email)) {
      return err(res, 409, "EMAIL_EXISTS", "כתובת אימייל זו כבר רשומה במערכת");
    }
  } catch {
    // Non-fatal — proceed, Supabase will catch duplicates
  }

  // Create Supabase Auth user (email_confirm: true → instant access, no verification email)
  const { error: authError, user: authUser } = await supabaseAdminCreateUser(email, password);
  if (authError || !authUser?.id) {
    const msg = authError || "יצירת חשבון נכשלה";
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("duplicate")) {
      return err(res, 409, "EMAIL_EXISTS", "כתובת אימייל זו כבר רשומה במערכת");
    }
    return err(res, 502, "AUTH_CREATE_FAILED", msg);
  }

  // Create advisor profile in our advisors table
  const advisorId = `adv_${randomUUID().slice(0, 8)}`;
  try {
    await createAdvisor({
      advisorId,
      authUserId: authUser.id,
      name: fullName,
      phone,
      email,
      active: true,
      commissionType: "lead",
      commissionAmount: "",
      region,
      advisorType,
      businessName,
    });
  } catch (profileErr) {
    console.error("[advisor/register] profile create failed:", profileErr?.message);
    // Profile creation failed — advisor exists in Supabase Auth but not our table.
    // Still issue session; profile data can be repaired later.
  }

  res.setHeader("Set-Cookie", createAdvisorSessionCookie(advisorId));
  return res.status(201).json({ ok: true, advisorId });
}
