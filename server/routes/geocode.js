// backend/routes/geocode.js
import { Router } from "express";
import { geocodeAddress } from "../lib/geocode.js";

const router = Router();

router.post("/", async (req, res) => {
  const { address } = req.body;
  if (!address || address.trim().length < 5) {
    return res.status(400).json({ success: false, message: "A fuller address is needed to locate it." });
  }
  try {
    const { latitude, longitude } = await geocodeAddress(address);
    if (latitude == null) {
      return res.status(404).json({ success: false, message: "Couldn't find that address — check spelling or add more detail." });
    }
    res.json({ success: true, latitude, longitude });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;