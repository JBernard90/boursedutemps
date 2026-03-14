// Utilitaire Cloudinary pour upload de médias
export const uploadToCloudinary = async (file: File): Promise<{ url: string; type: 'image' | 'video' }> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) throw new Error('Cloudinary non configuré');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const resourceType = file.type.startsWith('video') ? 'video' : 'image';
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error('Erreur upload Cloudinary');
  const data = await res.json();
  return { url: data.secure_url, type: resourceType };
};
