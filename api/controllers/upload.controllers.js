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

module.exports.deleteImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    const { restaurantId } = req.params;

    logger.info({ restaurantId, imageUrl }, "deleteImage called");

    if (!imageUrl) {
      logger.warn({ restaurantId }, "deleteImage: missing imageUrl");
      return res.status(400).json({ error: "imageUrl is required" });
    }

    // Extract file path from the public URL
    let parsed;
    try {
      parsed = new URL(imageUrl);
    } catch {
      logger.warn({ restaurantId, imageUrl }, "deleteImage: invalid URL");
      return res.status(400).json({ error: "Invalid image URL" });
    }
    const storagePath = parsed.pathname.split(`/object/public/${BUCKET}/`)[1];

    if (!storagePath) {
      logger.warn({ restaurantId, imageUrl, pathname: parsed.pathname }, "deleteImage: could not extract storage path");
      return res.status(400).json({ error: "Invalid image URL" });
    }

    // Validate the path belongs to this restaurant
    if (!storagePath.startsWith(`restaurants/${restaurantId}/`)) {
      logger.warn({ restaurantId, storagePath }, "deleteImage: path does not belong to restaurant");
      return res.status(403).json({ error: "Image does not belong to this restaurant" });
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([storagePath]);

    if (error) {
      logger.error({ error: error.message, storagePath }, "Failed to delete from Supabase Storage");
      return res.status(500).json({ error: "Failed to delete image" });
    }

    logger.info({ storagePath }, "Image deleted");
    return res.status(200).json({ message: "Image deleted" });
  } catch (error) {
    next(error);
  }
};
