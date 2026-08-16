import React from "react";
import { useState } from "react";
import { useSwish } from "../context/SwishContext";

export default function CreatePostModal({ onClose }) {
  const { createPost } = useSwish();
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const pickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("Only JPG, PNG and WEBP are supported.");
    if (file.size > 5 * 1024 * 1024) return setError("Image must be under 5MB.");
    setError("");
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => { setImage(reader.result); setUploading(false); };
    reader.readAsDataURL(file);
  };

  const publish = () => {
    if (!caption.trim() && !image) return setError("Add an image or caption first.");
    createPost({ caption, image });
    onClose();
  };

  return <div className="modal-backdrop">
    <div className="modal">
      <div className="modal-head"><h2>Create Post</h2><button onClick={onClose}>×</button></div>
      <label className="upload-box">
        {image ? <img src={image} alt="Preview"/> : <><span>＋</span><b>Drag & Drop / Browse Files</b><small>JPG, PNG, WEBP • Max 5MB</small></>}
        <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={pickImage}/>
      </label>
      {uploading && <div className="uploading">Uploading...</div>}
      {error && <div className="error">{error}</div>}
      <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="What's happening on campus?"/>
      <button className="primary full" onClick={publish}>SWISH IT →</button>
    </div>
  </div>;
}