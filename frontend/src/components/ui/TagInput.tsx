import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from './Badge';

export interface TagInputProps {
  label?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  hint?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  label,
  tags,
  onChange,
  placeholder = 'Add tag and press Enter',
  hint,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-ink/70">
          {label}
        </label>
      )}
      <div className="min-h-10 p-1.5 rounded-card bg-base border border-ink/15 flex flex-wrap items-center gap-1.5 focus-within:border-ink">
        {tags.map((tag) => (
          <Badge key={tag} variant="default" size="sm">
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:opacity-70 cursor-pointer ml-1"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <div className="flex items-center flex-1 min-w-[140px]">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : 'Add more...'}
            className="w-full text-sm bg-transparent px-2 py-1 text-ink placeholder:text-ink/40 outline-none"
          />
          {inputValue.trim() && (
            <button
              type="button"
              onClick={addTag}
              className="p-1 text-ink/70 hover:text-ink cursor-pointer shrink-0"
              aria-label="Add tag"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {hint && <p className="text-xs text-ink/60">{hint}</p>}
    </div>
  );
};
