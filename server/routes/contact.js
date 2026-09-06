// backend/routes/contact.js
import { Router } from "express";
import { sendContactNotification } from "../lib/mailer.js";

const router = Router();

router.post("/", async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }
  try {
    await sendContactNotification({ name, email, message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;