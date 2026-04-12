import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableItemWrapperProps {
    id: string;
    disabled?: boolean;
    children: React.ReactNode;
}

export default function SortableItemWrapper({ id, disabled, children }: SortableItemWrapperProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative' as const,
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <div className={`relative h-full ${!disabled ? 'cursor-grab active:cursor-grabbing' : ''}`} {...(!disabled ? listeners : {})}>
                 {children}
            </div>
        </div>
    );
}
