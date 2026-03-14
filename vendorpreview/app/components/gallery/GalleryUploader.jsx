"use client";

import { useEffect, useMemo, useState } from "react";
import GalleryPreview from "./GalleryPreview";

const MAX_IMAGES = 5;

export default function GalleryUploader({ endpoint, disabled, onUploaded }) {
  const [selectedImages, setSelectedImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canUpload = useMemo(
    () => !disabled && !uploading && selectedImages.length > 0,
    [disabled, uploading, selectedImages.length]
  );

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);

    setError("");
    setSuccess("");

    if (!files.length) return;

    const onlyImages = files.filter((file) => file.type.startsWith("image/"));

    if (onlyImages.length !== files.length) {
      setError("Only image files are allowed.");
      event.target.value = "";
      return;
    }

    const remaining = MAX_IMAGES - selectedImages.length;

    if (onlyImages.length > remaining) {
      setError(`You can upload a maximum of ${MAX_IMAGES} images.`);
      event.target.value = "";
      return;
    }

    const nextPreviews = onlyImages.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setSelectedImages((prev) => [...prev, ...onlyImages]);
    setPreviewImages((prev) => [...prev, ...nextPreviews]);
    event.target.value = "";
  };

  const handleRemove = (index) => {
    setSuccess("");
    setError("");

    setSelectedImages((prev) => prev.filter((_, idx) => idx !== index));
    setPreviewImages((prev) => {
      const copy = [...prev];
      const removed = copy[index];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      copy.splice(index, 1);
      return copy;
    });
  };

  const clearAll = () => {
    previewImages.forEach((item) => {
      if (item?.url) URL.revokeObjectURL(item.url);
    });
    setSelectedImages([]);
    setPreviewImages([]);
  };

  useEffect(() => {
    return () => {
      previewImages.forEach((item) => {
        if (item?.url) URL.revokeObjectURL(item.url);
      });
    };
  }, [previewImages]);

  const handleUpload = async () => {
    if (!endpoint || !selectedImages.length) return;

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      selectedImages.forEach((file) => {
        formData.append("images", file);
      });

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Upload failed");
      }

      clearAll();
      setSuccess("Images uploaded successfully.");
      await onUploaded?.();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to upload images.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="gallery-uploader">
      <div className="gallery-uploader-top">
        <label className="gallery-file-btn">
          Select Images
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={disabled || uploading || selectedImages.length >= MAX_IMAGES}
          />
        </label>

        <div className="gallery-file-meta">
          {selectedImages.length}/{MAX_IMAGES} selected
        </div>
      </div>

      <GalleryPreview previewImages={previewImages} onRemove={handleRemove} />

      {disabled && (
        <div className="gallery-error">
          Vendor or row ID is missing. Unable to upload images.
        </div>
      )}
      {error && <div className="gallery-error">{error}</div>}
      {success && <div className="gallery-success">{success}</div>}

      <button className="gallery-upload-btn" onClick={handleUpload} disabled={!canUpload}>
        {uploading ? (
          <span className="gallery-uploading-wrap">
            <span className="gallery-spinner" /> Uploading...
          </span>
        ) : (
          "Upload Images"
        )}
      </button>
    </div>
  );
}
