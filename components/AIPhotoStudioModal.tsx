import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/apiService';
import XIcon from './icons/XIcon';
import SparklesIcon from './icons/SparklesIcon';
import { useLocalization } from '../hooks/useLocalization';
import { getPlatformSettings } from '../services/platformSettingsService';
import { usePermissions } from '../hooks/usePermissions';
import { Shop } from '../types';

interface AIPhotoStudioModalProps {
    imageUrl: string;
    onSave: (newImageUrl: string) => void;
    onClose: () => void;
    permissions: ReturnType<typeof usePermissions>;
    onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
    shop: Shop;
}

const imageUrlToData = async (url: string): Promise<{ base64: string, mimeType: string }> => {
    let initialBlob: Blob;

    if (url.startsWith('data:')) {
        const response = await fetch(url);
        initialBlob = await response.blob();
    } else {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        initialBlob = await response.blob();
    }

    // Convert any image format to a processable format and crop to a 1:1 square
    const croppedBlob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(initialBlob);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                URL.revokeObjectURL(objectUrl);
                return;
            }

            const { naturalWidth: width, naturalHeight: height } = img;
            const cropSize = Math.min(width, height);
            
            // Set canvas size to the target crop size
            canvas.width = cropSize;
            canvas.height = cropSize;

            // Calculate source coordinates to center the crop
            const sx = (width - cropSize) / 2;
            const sy = (height - cropSize) / 2;
            
            // Draw the centered, cropped image onto the canvas
            ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, cropSize, cropSize);

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Canvas to Blob conversion failed"));
                }
            }, 'image/jpeg', 0.95); // Use jpeg for better compatibility
            
            URL.revokeObjectURL(objectUrl);
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(err);
        };
        img.src = objectUrl;
    });

    // Convert the final cropped blob to base64
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            if (!result) {
                reject(new Error("File could not be read."));
                return;
            }
            const [, base64] = result.split(',');
            resolve({ base64, mimeType: croppedBlob.type });
        };
        reader.onerror = reject;
        reader.readAsDataURL(croppedBlob);
    });
};

const AIPhotoStudioModal: React.FC<AIPhotoStudioModalProps> = ({ imageUrl, onSave, onClose, permissions, onUpdateShop, shop }) => {
    const { t } = useLocalization();
    const [originalImage, setOriginalImage] = useState<{ base64: string, mimeType: string} | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [customPrompt, setCustomPrompt] = useState('');

    const platformSettings = getPlatformSettings();
    const presets = platformSettings.aiConfig.photoStudioConfig.presets;

    const { remaining: photoCredits, limit: photoLimit } = permissions.getRemainingCredits('aiPhotoStudio');

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        imageUrlToData(imageUrl)
            .then(data => setOriginalImage(data))
            .catch(err => setError(t('failedToLoadImage')))
            .finally(() => setIsLoading(false));
    }, [imageUrl, t]);

    const handleGenerate = useCallback(async (prompt: string) => {
        if (!originalImage) return;
        if (photoCredits !== null && photoCredits <= 0) {
            setError("No more AI Photo Studio credits remaining this month.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        try {
            const result = await api.editProductImage(originalImage.base64, originalImage.mimeType, prompt);
            setGeneratedImage(result);
            onUpdateShop(permissions.consumeCredit('aiPhotoStudio'));
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : t('unknownError'));
        } finally {
            setIsLoading(false);
        }
    }, [originalImage, t, permissions, onUpdateShop, photoCredits]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl border border-gray-700 flex flex-col max-h-[95vh]">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-purple-400"/> {t('aiPhotoStudio')}</h3>
                        <span className="text-sm text-gray-400">
                            {photoLimit !== null ? `(${photoCredits} / ${photoLimit} credits left)` : '(Unlimited credits)'}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"><XIcon className="w-5 h-5" /></button>
                </header>

                <div className="flex-grow p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                    {/* Image Previews */}
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-gray-300 mb-2">{t('original')}</h4>
                            <div className="aspect-square bg-gray-900/50 rounded-lg flex items-center justify-center border border-gray-600">
                                {originalImage ? <img src={`data:${originalImage.mimeType};base64,${originalImage.base64}`} alt={t('original')} className="max-w-full max-h-full object-contain rounded-lg"/> : <p className="text-gray-500 text-sm">{t('loading')}</p>}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-300 mb-2">{t('generatedImage')}</h4>
                            <div className="aspect-square bg-gray-900/50 rounded-lg flex items-center justify-center border border-gray-600 relative">
                                {isLoading && (
                                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-lg z-10">
                                        <div className="w-8 h-8 border-4 border-white border-t-purple-400 rounded-full animate-spin"></div>
                                        <p className="mt-3 text-sm text-white">{t('generating')}</p>
                                    </div>
                                )}
                                {generatedImage && <img src={generatedImage} alt={t('generated')} className="max-w-full max-h-full object-contain rounded-lg"/>}
                                {!isLoading && !generatedImage && <p className="text-gray-500 text-sm p-4 text-center">{t('generatedImagePlaceholder')}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-semibold text-gray-300 mb-2">{t('chooseAStyle')}</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {presets.map(p => <button key={p.id} onClick={() => handleGenerate(p.prompt)} disabled={isLoading || !originalImage || (photoCredits !== null && photoCredits <= 0)} className="p-3 text-sm bg-gray-700 hover:bg-gray-600 rounded-md disabled:opacity-50">{p.name}</button>)}
                            </div>
                        </div>
                         <div>
                            <h4 className="font-semibold text-gray-300 mb-2">{t('useCustomPrompt')}</h4>
                            <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder={t('customPromptPlaceholder')} rows={3} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-sm text-white placeholder-gray-400"></textarea>
                            <button onClick={() => handleGenerate(customPrompt)} disabled={isLoading || !originalImage || !customPrompt.trim() || (photoCredits !== null && photoCredits <= 0)} className="mt-2 w-full p-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">{t('generateWithCustomPrompt')}</button>
                        </div>
                        {error && <p className="text-red-400 text-sm bg-red-900/30 p-3 rounded-md">{error}</p>}
                    </div>
                </div>

                <footer className="p-4 bg-gray-900/50 flex justify-end gap-3 flex-shrink-0 border-t border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">{t('cancel')}</button>
                    <button onClick={() => generatedImage && onSave(generatedImage)} disabled={!generatedImage || isLoading} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed">{t('acceptAndSave')}</button>
                </footer>
            </div>
        </div>
    );
};

export default AIPhotoStudioModal;