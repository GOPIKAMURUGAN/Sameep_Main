"use client";

export default function GalleryPreview({ previewImages, onRemove }) {
  if (!previewImages.length) {
    return <div className="gallery-muted">No images selected.</div>;
  }

  return (
    <div className="gallery-preview-grid">
      {previewImages.map((item, index) => (
        <div key={`${item.url}-${index}`} className="gallery-preview-item">
          <img src={item.url} alt={`Selected image ${index + 1}`} />
         <button
  type="button"
  className="gallery-remove-btn"
  onClick={() => onRemove(index)}
  aria-label="Remove image"
>
  ✕
</button>
        </div>
      ))}
    </div>
  );
}
