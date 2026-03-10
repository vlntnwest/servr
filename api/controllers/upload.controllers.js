const path = require("path");
const supabase = require("../lib/supabase");
const logger = require("../logger");

const BUCKET = "images";
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 5;

module.exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      return res
        .status(400)
        .json({ error: "Invalid file type. Allowed: jpeg, png, webp, gif" });
    }

    if (req.file.size > MAX_SIZE_MB * 1024 * 1024) {
      return res
        .status(400)
        .json({ error: `File too large. Max size: ${MAX_SIZE_MB}MB` });
    }

    const ext = path.extname(req.file.originalname) || `.${req.file.mimetype.split("/")[1]}`;
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = req.params.restaurantId
      ? `restaurants/${req.params.restaurantId}/${filename}`
      : `public/${filename}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) {
      logger.error({ error: error.message }, "Failed to upload to Supabase Storage");
      return res.status(500).json({ error: "Failed to upload image" });
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    logger.info({ filePath }, "Image uploaded");
    return res.status(201).json({ data: { url: publicUrl } });
  } catch (error) {
    next(error);
  }
};
