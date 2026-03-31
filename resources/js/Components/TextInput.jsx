import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, ...props },
    ref,
) {
    const localRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={
                // text-base (16px) est obligatoire pour éviter le zoom automatique sur iOS/Safari
                'rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base ' +
                className
            }
            ref={localRef}
        />
    );
});
