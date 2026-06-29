import React, { useState, useRef } from 'react';
import { NavigationProps, ScreenName } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

const UploadManual: React.FC<NavigationProps> = ({ navigate }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Hydraulics');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-fill title if empty
      if (!title) {
        const cleanName = selectedFile.name.replace(/\.[^/.]+$/, ""); // strip extension
        setTitle(cleanName);
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError(t('uploadManual.errorTitleRequired') || 'Equipment name is required');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      let fileUrl = '';
      let imageUrl = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=300&q=80'; // fallback placeholder image

      if (file) {
        // 1. Get presigned upload URL
        const isPdf = file.type === 'application/pdf';
        const fileType = isPdf ? 'pdf' : 'image';
        
        const presignRes = await fetch('/api/upload/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileType,
            contentType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
            originalFilename: file.name,
          }),
        });

        if (!presignRes.ok) {
          throw new Error('Failed to generate presigned upload URL');
        }

        const { uploadUrl, publicUrl } = await presignRes.json();

        // 2. Upload file directly to S3
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
          },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload file to storage');
        }

        if (isPdf) {
          fileUrl = publicUrl;
        } else {
          imageUrl = publicUrl;
        }
      }

      // 3. Create manual in database
      const saveRes = await fetch('/api/manuals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          category,
          description,
          image_url: imageUrl,
          file_url: fileUrl,
        }),
      });

      if (!saveRes.ok) {
        throw new Error('Failed to save manual record to database');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate(ScreenName.MANUALS);
      }, 1500);
    } catch (err: any) {
      console.error('Error saving manual:', err);
      setError(err.message || 'An unexpected error occurred during save.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col bg-background-dark font-display overflow-x-hidden">
      {/* Top App Bar */}
      <div className="flex items-center p-4 pb-2 pt-6 justify-between sticky top-0 bg-background-dark z-10 border-b border-slate-700/50">
        <button 
          onClick={() => navigate(ScreenName.MANUALS)}
          disabled={uploading}
          className="flex size-12 shrink-0 items-center justify-start text-[#E2E8F0] hover:text-white disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-3xl">close</span>
        </button>
        <h2 className="text-[#E2E8F0] text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">{t('uploadManual.title')}</h2>
        <div className="flex size-12 shrink-0 items-center"></div>
      </div>

      <div className="p-4 flex flex-col gap-6 flex-grow">
        {/* Alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-center gap-3 text-red-200 text-sm animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-red-500">error</span>
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-lg flex items-center gap-3 text-green-200 text-sm animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-green-400">check_circle</span>
            <p>Manual saved successfully to library!</p>
          </div>
        )}

        {/* Upload Area */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <div 
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4 transition-all cursor-pointer group ${file ? 'border-primary-green bg-primary-green/5' : 'border-slate-600 bg-card-dark/30 hover:bg-card-dark/50 hover:border-primary-green/50'}`}
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${file ? 'bg-primary-green/20' : 'bg-slate-700/50'}`}>
            <span className={`material-symbols-outlined text-3xl ${file ? 'text-primary-green' : 'text-slate-400'}`}>
              {file ? 'task' : 'cloud_upload'}
            </span>
          </div>
          <div>
            <p className="text-white font-bold text-lg">
              {file ? file.name : t('uploadManual.tapToUpload')}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB • ${file.type}` : t('uploadManual.dragDrop')}
            </p>
          </div>
        </div>

        {/* Manual Details Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{t('uploadManual.equipmentName')}</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('uploadManual.placeholderName')} 
              className="w-full bg-card-dark border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-primary-green focus:ring-1 focus:ring-primary-green transition-colors"
              disabled={uploading}
            />
          </div>
          
          <div className="flex gap-4">
            <div className="flex-grow">
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('uploadManual.category')}</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-card-dark border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-primary-green focus:ring-1 focus:ring-primary-green transition-colors"
                disabled={uploading}
              >
                <option value="Hydraulics">{t('manuals.categories.hydraulics') || 'Hydraulics'}</option>
                <option value="Pneumatics">{t('manuals.categories.pneumatics') || 'Pneumatics'}</option>
                <option value="Electrical">{t('manuals.categories.electrical') || 'Electrical'}</option>
                <option value="HVAC">{t('manuals.categories.hvac') || 'HVAC'}</option>
                <option value="Automation">{t('manuals.categories.automation') || 'Automation'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{t('uploadManual.description')}</label>
            <textarea 
              rows={3} 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('uploadManual.placeholderDesc')} 
              className="w-full bg-card-dark border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-primary-green focus:ring-1 focus:ring-primary-green transition-colors resize-none"
              disabled={uploading}
            ></textarea>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-700/50 bg-background-dark">
        <button 
          onClick={handleSave}
          disabled={uploading || success}
          className="w-full bg-primary-green text-black font-bold py-4 px-6 rounded-xl shadow-lg shadow-green-500/20 hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Saving & Uploading...
            </>
          ) : (
            t('uploadManual.saveLibrary')
          )}
        </button>
      </div>
    </div>
  );
};

export default UploadManual;
