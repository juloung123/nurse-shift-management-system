'use client';

import { useRef, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface TimeInput24Props {
    value: string; // "HH:MM" or ""
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    id?: string;
}

/**
 * 24-hour time input component.
 *
 * Renders as a text input that accepts HH:MM (00:00-23:59).
 * Always displays in 24-hour format regardless of OS locale,
 * unlike <input type="time"> which follows system settings.
 */
export default function TimeInput24({
    value,
    onChange,
    placeholder = '00:00',
    className,
    id,
}: TimeInput24Props) {
    const inputRef = useRef<HTMLInputElement>(null);

    /**
     * Format a raw digit string into HH:MM as the user types.
     */
    const handleChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            let raw = e.target.value;

            // Allow clearing
            if (raw === '') {
                onChange('');
                return;
            }

            // Strip everything except digits and ':'
            raw = raw.replace(/[^\d:]/g, '');

            // If user types digits without colon, auto-format
            const digits = raw.replace(/:/g, '');

            if (digits.length <= 2) {
                // Still typing hours
                onChange(digits);
                return;
            }

            // 3+ digits → format as HH:MM
            const hh = digits.slice(0, 2);
            const mm = digits.slice(2, 4);
            onChange(`${hh}:${mm}`);
        },
        [onChange]
    );

    /**
     * On blur, validate and normalize to HH:MM.
     */
    const handleBlur = useCallback(() => {
        if (!value) return;

        const digits = value.replace(/:/g, '');
        if (digits.length === 0) {
            onChange('');
            return;
        }

        let hh = 0;
        let mm = 0;

        if (digits.length <= 2) {
            hh = Math.min(23, parseInt(digits, 10) || 0);
        } else {
            hh = Math.min(23, parseInt(digits.slice(0, 2), 10) || 0);
            mm = Math.min(59, parseInt(digits.slice(2, 4), 10) || 0);
        }

        onChange(
            `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
        );
    }, [value, onChange]);

    /**
     * Arrow keys to increment/decrement time.
     */
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
            e.preventDefault();

            const parts = (value || '00:00').split(':');
            let hh = parseInt(parts[0], 10) || 0;
            let mm = parseInt(parts[1], 10) || 0;

            const delta = e.key === 'ArrowUp' ? 1 : -1;

            // Check cursor position to decide increment hours or minutes
            const cursorPos = inputRef.current?.selectionStart ?? 0;
            if (cursorPos <= 2) {
                // Increment hours
                hh = (hh + delta + 24) % 24;
            } else {
                // Increment minutes
                mm = (mm + delta + 60) % 60;
            }

            onChange(
                `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
            );
        },
        [value, onChange]
    );

    return (
        <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
                'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors',
                'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'md:text-sm',
                className
            )}
        />
    );
}
