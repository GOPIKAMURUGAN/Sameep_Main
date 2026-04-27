"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../config";
import GalleryUploader from "./GalleryUploader";
import { getVendorAuthHeaders } from "../../utils/vendorAuth";
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

function getVisibleAlbumImages(album) {
  if (!Array.isArray(album?.images)) return [];
  return album.images.filter((image) => image?.isActive !== false && image?.imageUrl);
}

export default function VendorGalleryModal({ vendorId, rowId, onClose, readOnly = false }) {
  const [albums, setAlbums] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const [deletingImage, setDeletingImage] = useState("");
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [updatingAlbum, setUpdatingAlbum] = useState(false);
  const [fallbackImages, setFallbackImages] = useState([]);
  const [usingFallback, setUsingFallback] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(null);

  const galleryEndpoint = useMemo(() => {
    if (!vendorId) return "";
    return `${API_BASE_URL}/api/vendor-gallery/${vendorId}`;
  }, [vendorId]);

  const selectedAlbum = useMemo(
    () => albums.find((album) => String(album._id) === String(selectedAlbumId)) || albums[0] || null,
    [albums, selectedAlbumId]
  );
  const vendorAuthHeaders = useMemo(() => getVendorAuthHeaders(vendorId), [vendorId]);

  const uploadEndpoint = useMemo(() => {
    if (!vendorId || !selectedAlbum?._id || usingFallback) return "";
    return `${API_BASE_URL}/api/vendor-gallery/${vendorId}/albums/${selectedAlbum._id}/images`;
  }, [vendorId, selectedAlbum?._id, usingFallback]);

  const fallbackEndpoint = useMemo(() => {
    if (!vendorId || !rowId) return "";
    return `${API_BASE_URL}/api/dummy-vendors/${vendorId}/rows/${rowId}/images`;
  }, [vendorId, rowId]);

  const loadFallbackGallery = useCallback(async () => {
    if (!fallbackEndpoint) return;

    try {
      const res = await fetch(fallbackEndpoint, { method: "GET" });
      if (!res.ok) {
        setFallbackImages([]);
        return;
      }
      const json = await res.json();
      setFallbackImages(extractGalleryUrls(json));
      setUsingFallback(true);
    } catch (err) {
      console.error(err);
      setFallbackImages([]);
    }
  }, [fallbackEndpoint]);

  const loadGallery = useCallback(async () => {
    if (!galleryEndpoint) return;

    try {
      setLoadingGallery(true);
      setGalleryError("");
      setUsingFallback(false);

      const res = await fetch(galleryEndpoint, { method: "GET" });
      if (!res.ok) throw new Error("Failed to load gallery albums");

      const json = await res.json();
      const nextAlbums = Array.isArray(json?.albums) ? json.albums : [];
      setAlbums(nextAlbums);
      setSelectedAlbumId((prev) => {
        if (nextAlbums.some((album) => String(album._id) === String(prev))) return prev;
        return nextAlbums[0]?._id || "";
      });
    } catch (err) {
      console.error(err);
      setGalleryError("Unable to load gallery albums.");
      await loadFallbackGallery();
    } finally {
      setLoadingGallery(false);
    }
  }, [galleryEndpoint, loadFallbackGallery]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const handleCreateAlbum = async () => {
    const title = newAlbumTitle.trim();
    if (!title || !galleryEndpoint) return;

    try {
      setCreatingAlbum(true);
      setGalleryError("");
      const res = await fetch(`${galleryEndpoint}/albums`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...vendorAuthHeaders },
        body: JSON.stringify({ title }),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to create album");
      }
      setNewAlbumTitle("");
      await loadGallery();
      if (json?.album?._id) setSelectedAlbumId(json.album._id);
    } catch (err) {
      console.error(err);
      setGalleryError(err.message || "Unable to create album.");
    } finally {
      setCreatingAlbum(false);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!vendorId || !selectedAlbum?._id) return;

    const confirmDelete = window.confirm(
      `Delete "${selectedAlbum.title}" album and all images inside it?`
    );
    if (!confirmDelete) return;

    try {
      setUpdatingAlbum(true);
      setGalleryError("");
      const res = await fetch(`${galleryEndpoint}/albums/${selectedAlbum._id}`, {
        method: "DELETE",
        headers: vendorAuthHeaders,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to delete album");
      }
      setSelectedAlbumId("");
      await loadGallery();
    } catch (err) {
      console.error(err);
      setGalleryError(err.message || "Unable to delete album.");
    } finally {
      setUpdatingAlbum(false);
    }
  };

  const handleSetCoverImage = async (imageUrl) => {
    if (!vendorId || !selectedAlbum?._id || !imageUrl) return;

    try {
      setUpdatingAlbum(true);
      setGalleryError("");
      const res = await fetch(`${galleryEndpoint}/albums/${selectedAlbum._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...vendorAuthHeaders },
        body: JSON.stringify({ coverImageUrl: imageUrl }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to set cover image");
      }
      await loadGallery();
    } catch (err) {
      console.error(err);
      setGalleryError(err.message || "Unable to set album preview.");
    } finally {
      setUpdatingAlbum(false);
    }
  };

  const handleDeleteImage = useCallback(
    async (image) => {
      if (!vendorId || !selectedAlbum?._id || !image?._id) return;

      const confirmDelete = window.confirm("Delete this image from gallery?");
      if (!confirmDelete) return;

      try {
        setDeletingImage(image._id);
        setGalleryError("");

        const res = await fetch(
          `${API_BASE_URL}/api/vendor-gallery/${vendorId}/albums/${selectedAlbum._id}/images/${image._id}`,
          { method: "DELETE", headers: vendorAuthHeaders }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.success === false) {
          throw new Error(json?.message || "Failed to delete image");
        }

        await loadGallery();
      } catch (err) {
        console.error(err);
        setGalleryError("Unable to delete image.");
      } finally {
        setDeletingImage("");
      }
    },
    [vendorId, selectedAlbum?._id, loadGallery, vendorAuthHeaders]
  );

  const handleFallbackDeleteImage = useCallback(
    async (imageUrl, imageIndex) => {
      if (!fallbackEndpoint || imageIndex === undefined || imageIndex === null) return;

      const confirmDelete = window.confirm("Delete this image from gallery?");
      if (!confirmDelete) return;

      try {
        setDeletingImage(imageUrl);
        setGalleryError("");

        const res = await fetch(`${fallbackEndpoint}/${imageIndex}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete image");

        await loadFallbackGallery();
      } catch (err) {
        console.error(err);
        setGalleryError("Unable to delete image.");
      } finally {
        setDeletingImage("");
      }
    },
    [fallbackEndpoint, loadFallbackGallery]
  );

  const visibleAlbums = albums.filter((album) => album?.isActive !== false);
  const selectedImages = getVisibleAlbumImages(selectedAlbum);
  const previewImages = usingFallback
    ? fallbackImages.map((imageUrl) => ({ imageUrl }))
    : selectedImages;
  const previewImage =
    Number.isInteger(previewImageIndex) && previewImages[previewImageIndex]
      ? previewImages[previewImageIndex]
      : null;

  const closePreview = useCallback(() => {
    setPreviewImageIndex(null);
  }, []);

  const showNextPreview = useCallback(() => {
    setPreviewImageIndex((current) => {
      if (!previewImages.length || !Number.isInteger(current)) return null;
      return (current + 1) % previewImages.length;
    });
  }, [previewImages.length]);

  const showPreviousPreview = useCallback(() => {
    setPreviewImageIndex((current) => {
      if (!previewImages.length || !Number.isInteger(current)) return null;
      return (current - 1 + previewImages.length) % previewImages.length;
    });
  }, [previewImages.length]);

  const handleAlbumClick = useCallback(
    (album) => {
      const albumImages = getVisibleAlbumImages(album);
      setSelectedAlbumId(album._id);

      if (readOnly && albumImages.length) {
        setPreviewImageIndex(0);
      } else {
        setPreviewImageIndex(null);
      }
    },
    [readOnly]
  );

  const handlePreviewKeyDown = useCallback((event, index) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setPreviewImageIndex(index);
    }
  }, []);

  useEffect(() => {
    if (!previewImage) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closePreview();
      if (event.key === "ArrowRight") showNextPreview();
      if (event.key === "ArrowLeft") showPreviousPreview();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewImage, closePreview, showNextPreview, showPreviousPreview]);

  return (
    <div className="gallery-overlay" role="dialog" aria-modal="true">
      <div className="gallery-modal gallery-album-modal">
        <div className="gallery-modal-header">
          <div>
            <h2 className="gallery-modal-title">Gallery</h2>
            <p className="gallery-modal-subtitle">
              {readOnly
                ? "Browse albums and view recent work."
                : "Create albums for your work and upload photos inside each folder."}
            </p>
          </div>

          <button className="gallery-close-btn" onClick={onClose}>
            x
          </button>
        </div>

        {galleryError && <div className="gallery-error">{galleryError}</div>}
        {loadingGallery && <div className="gallery-muted">Loading gallery...</div>}

        {!usingFallback ? (
          <>
            {!readOnly && (
              <div className="gallery-create-album">
                <input
                  type="text"
                  value={newAlbumTitle}
                  onChange={(event) => setNewAlbumTitle(event.target.value)}
                  placeholder="Create custom album, e.g. Baby Shower Decor"
                />
                <button type="button" onClick={handleCreateAlbum} disabled={!newAlbumTitle.trim() || creatingAlbum}>
                  {creatingAlbum ? "Adding..." : "Add Album"}
                </button>
              </div>
            )}

            <div className="gallery-album-grid">
              {visibleAlbums.map((album) => (
                <button
                  type="button"
                  key={album._id}
                  className={`gallery-album-card ${String(selectedAlbum?._id) === String(album._id) ? "selected" : ""}`}
                  onClick={() => handleAlbumClick(album)}
                >
                  {album.coverImageUrl ? (
                    <img src={album.coverImageUrl} alt={album.title} />
                  ) : (
                    <span className="gallery-album-placeholder">{album.title.charAt(0).toUpperCase()}</span>
                  )}
                  <span className="gallery-album-title">{album.title}</span>
                  <span className="gallery-album-count">{album.imageCount || 0} image{album.imageCount === 1 ? "" : "s"}</span>
                </button>
              ))}
            </div>

            {selectedAlbum ? (
              <>
                <div className="gallery-divider" />
                <div className="gallery-selected-header">
                  <div>
                    <div className="gallery-section-title">{selectedAlbum.title}</div>
                    <div className="gallery-muted">{selectedImages.length} uploaded image{selectedImages.length === 1 ? "" : "s"}</div>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      className="gallery-danger-btn"
                      onClick={handleDeleteAlbum}
                      disabled={updatingAlbum}
                    >
                      {updatingAlbum ? "Working..." : "Delete Album"}
                    </button>
                  )}
                </div>

                {!readOnly && (
                  <GalleryUploader
                    endpoint={uploadEndpoint}
                    disabled={!vendorId || !selectedAlbum?._id}
                    onUploaded={loadGallery}
                    maxImages={20}
                    headers={vendorAuthHeaders}
                  />
                )}

                <div className="gallery-existing-grid">
                  {selectedImages.map((image, index) => (
                    <div
                      key={image._id || image.imageUrl}
                      className="gallery-existing-item"
                      onClick={() => setPreviewImageIndex(index)}
                      onKeyDown={(event) => handlePreviewKeyDown(event, index)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Preview ${selectedAlbum.title} image ${index + 1}`}
                    >
                      <img src={image.imageUrl} alt={image.caption || selectedAlbum.title} loading="lazy" />
                      {!readOnly && (
                        <>
                          <button
                            type="button"
                            className={`gallery-cover-btn ${selectedAlbum.coverImageUrl === image.imageUrl ? "selected" : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleSetCoverImage(image.imageUrl);
                            }}
                            disabled={updatingAlbum}
                          >
                            {selectedAlbum.coverImageUrl === image.imageUrl ? "Cover" : "Set Cover"}
                          </button>
                          <button
                            type="button"
                            className="gallery-existing-remove-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteImage(image);
                            }}
                            disabled={deletingImage === image._id}
                            aria-label="Delete uploaded image"
                          >
                            {deletingImage === image._id ? "..." : "x"}
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {!selectedImages.length && <div className="gallery-muted">No images uploaded in this album yet.</div>}
              </>
            ) : (
              <div className="gallery-muted">No albums available yet.</div>
            )}
          </>
        ) : (
          <>
            {!readOnly && (
              <GalleryUploader
                endpoint={fallbackEndpoint}
                disabled={!vendorId || !rowId}
                onUploaded={loadFallbackGallery}
                maxImages={5}
                headers={vendorAuthHeaders}
              />
            )}
            <div className="gallery-divider" />
            <div className="gallery-section-title">Uploaded Images</div>
            <div className="gallery-existing-grid">
              {fallbackImages.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="gallery-existing-item"
                  onClick={() => setPreviewImageIndex(idx)}
                  onKeyDown={(event) => handlePreviewKeyDown(event, idx)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Preview gallery image ${idx + 1}`}
                >
                  <img src={url} alt={`Gallery image ${idx + 1}`} loading="lazy" />
                  {!readOnly && (
                    <button
                      type="button"
                      className="gallery-existing-remove-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleFallbackDeleteImage(url, idx);
                      }}
                      disabled={deletingImage === url}
                      aria-label="Delete uploaded image"
                    >
                      {deletingImage === url ? "..." : "x"}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!fallbackImages.length && <div className="gallery-muted">No images uploaded yet.</div>}
          </>
        )}
      </div>
      {previewImage ? (
        <div className="gallery-lightbox" role="dialog" aria-modal="true" onClick={closePreview}>
          <div className="gallery-lightbox-card" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="gallery-lightbox-close"
              onClick={closePreview}
              aria-label="Close image preview"
            >
              x
            </button>

            {previewImages.length > 1 && (
              <button
                type="button"
                className="gallery-lightbox-nav gallery-lightbox-prev"
                onClick={showPreviousPreview}
                aria-label="Previous image"
              >
                ‹
              </button>
            )}

            <img
              src={previewImage.imageUrl}
              alt={previewImage.caption || selectedAlbum?.title || "Gallery preview"}
            />

            {previewImages.length > 1 && (
              <button
                type="button"
                className="gallery-lightbox-nav gallery-lightbox-next"
                onClick={showNextPreview}
                aria-label="Next image"
              >
                ›
              </button>
            )}

            <div className="gallery-lightbox-caption">
              <strong>{selectedAlbum?.title || "Gallery"}</strong>
              <span>
                {previewImageIndex + 1} / {previewImages.length}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
