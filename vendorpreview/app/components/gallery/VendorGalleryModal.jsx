"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../config";
import GalleryUploader from "./GalleryUploader";
import "./VendorGalleryModal.css";

function extractGalleryUrls(payload) {
  if (!payload) return [];

  const source = payload.data || payload;

  if (Array.isArray(source)) {
    if (source.every((v) => typeof v === "string")) return source;

    return source
      .map((item) => item?.url || item?.imageUrl || item?.src)
      .filter(Boolean);
  }

  if (Array.isArray(source.images)) {
    return source.images
      .map((img) => (typeof img === "string" ? img : img?.url || img?.imageUrl || img?.src))
      .filter(Boolean);
  }

  if (Array.isArray(source.row?.images)) {
    return source.row.images
      .map((img) => (typeof img === "string" ? img : img?.url || img?.imageUrl || img?.src))
      .filter(Boolean);
  }

  return [];
}

export default function VendorGalleryModal({ vendorId, rowId, onClose }) {
  const [galleryImages, setGalleryImages] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const [deletingImage, setDeletingImage] = useState("");

  const endpoint = useMemo(() => {
    if (!vendorId || !rowId) return "";
    return `${API_BASE_URL}/api/dummy-vendors/${vendorId}/rows/${rowId}/images`;
  }, [vendorId, rowId]);

  const loadGallery = useCallback(async () => {
    if (!endpoint) return;

    try {
      setLoadingGallery(true);
      setGalleryError("");

      const res = await fetch(endpoint, { method: "GET" });

      if (!res.ok) {
        if (res.status === 404) {
          setGalleryImages([]);
          return;
        }

        throw new Error("Failed to load gallery");
      }

      const json = await res.json();
      setGalleryImages(extractGalleryUrls(json));
    } catch (err) {
      console.error(err);
      setGalleryError("Unable to load gallery images.");
    } finally {
      setLoadingGallery(false);
    }
  }, [endpoint]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const handleDeleteImage = useCallback(
    async (imageUrl, imageIndex) => {
      if (!endpoint || imageIndex === undefined || imageIndex === null) return;

      const confirmDelete = window.confirm("Delete this image from gallery?");
      if (!confirmDelete) return;

      try {
        setDeletingImage(imageUrl);
        setGalleryError("");

        const deleteEndpoint = `${endpoint}/${imageIndex}`;
        const res = await fetch(deleteEndpoint, { method: "DELETE" });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || "Failed to delete image");
        }

        await loadGallery();
      } catch (err) {
        console.error(err);
        setGalleryError("Unable to delete image.");
      } finally {
        setDeletingImage("");
      }
    },
    [endpoint, loadGallery]
  );

  return (
    <div className="gallery-overlay" role="dialog" aria-modal="true">
      <div className="gallery-modal">
        <div className="gallery-modal-header">
          <div>
            <h2 className="gallery-modal-title">My Gallery</h2>
            <p className="gallery-modal-subtitle">Upload up to 5 images for your gallery</p>
          </div>

          <button className="gallery-close-btn" onClick={onClose}>
            x
          </button>
        </div>

        <GalleryUploader
          endpoint={endpoint}
          disabled={!vendorId || !rowId}
          onUploaded={loadGallery}
        />

        <div className="gallery-divider" />

        <div className="gallery-existing-block">
          <div className="gallery-section-title">Uploaded Images</div>

          {loadingGallery && <div className="gallery-muted">Refreshing gallery...</div>}
          {galleryError && <div className="gallery-error">{galleryError}</div>}

          {!loadingGallery && !galleryImages.length && !galleryError && (
            <div className="gallery-muted">No images uploaded yet.</div>
          )}

          <div className="gallery-existing-grid">
            {galleryImages.map((url, idx) => (
              <div key={`${url}-${idx}`} className="gallery-existing-item">
                <img src={url} alt={`Gallery image ${idx + 1}`} loading="lazy" />
                <button
                  type="button"
                  className="gallery-existing-remove-btn"
                  onClick={() => handleDeleteImage(url, idx)}
                  disabled={deletingImage === url}
                  aria-label="Delete uploaded image"
                >
                  {deletingImage === url ? "..." : "x"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
