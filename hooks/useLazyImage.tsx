import { useEffect, useRef, useState } from 'react';

interface UseLazyImageOptions {
    /** Placeholder image URL to show while loading */
    placeholder?: string;
    /** Root margin for IntersectionObserver (default: '50px') */
    rootMargin?: string;
    /** Threshold for IntersectionObserver (default: 0.01) */
    threshold?: number;
}

/**
 * Custom hook for lazy loading images with IntersectionObserver
 * @param src - The actual image source URL
 * @param options - Configuration options
 * @returns Object containing the current image source and loading state
 */
export function useLazyImage(src: string, options: UseLazyImageOptions = {}) {
    const {
        placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23374151" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%239CA3AF" dy=".3em"%3ELoading...%3C/text%3E%3C/svg%3E',
        rootMargin = '50px',
        threshold = 0.01
    } = options;

    const [imageSrc, setImageSrc] = useState<string>(placeholder);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isInView, setIsInView] = useState<boolean>(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // IntersectionObserver to detect when image is in viewport
    useEffect(() => {
        if (!imgRef.current || isInView) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.disconnect();
                    }
                });
            },
            {
                rootMargin,
                threshold
            }
        );

        observer.observe(imgRef.current);

        return () => {
            observer.disconnect();
        };
    }, [isInView, rootMargin, threshold]);

    // Load the actual image once it's in view
    useEffect(() => {
        if (!isInView || !src) return;

        const img = new Image();
        img.src = src;

        img.onload = () => {
            setImageSrc(src);
            setIsLoading(false);
        };

        img.onerror = () => {
            // Fallback to a broken image placeholder
            setImageSrc('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23374151" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23EF4444" dy=".3em"%3EFailed to load%3C/text%3E%3C/svg%3E');
            setIsLoading(false);
        };

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [isInView, src]);

    return { imageSrc, isLoading, ref: imgRef };
}

/**
 * Lazy Image component that can be used directly
 */
export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    placeholder?: string;
    rootMargin?: string;
    threshold?: number;
}

export const LazyImage: React.FC<LazyImageProps> = ({
    src,
    placeholder,
    rootMargin,
    threshold,
    className = '',
    alt = '',
    ...props
}) => {
    const { imageSrc, isLoading, ref } = useLazyImage(src, {
        placeholder,
        rootMargin,
        threshold
    });

    return (
        <img
            ref={ref}
            src={imageSrc}
            alt={alt}
            className={`${className} ${isLoading ? 'blur-sm' : 'blur-0'} transition-all duration-300`}
            loading="lazy"
            {...props}
        />
    );
};
