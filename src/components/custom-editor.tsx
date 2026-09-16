
'use client' // Required only in App Router.

import { CKEditor, useCKEditorCloud } from '@ckeditor/ckeditor5-react';
import { useEffect, useRef } from 'react';

interface CustomEditorProps {
    value?: string;
    onChange?: (data: string) => void;
    placeholder?: string;
    onBlur?: () => void;
}

const CustomEditor = ({ value = '', onChange, placeholder, onBlur }: CustomEditorProps) => {
    const cloud = useCKEditorCloud( {
        version: '47.3.0',
        premium: true
    } );

    const editorRef = useRef<any>(null);

    if ( cloud.status === 'error' ) {
        return <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-600">Error loading editor!</div>;
    }

    if ( cloud.status === 'loading' ) {
        return (
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 text-gray-600">
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{
                        borderColor: '#7B2CBF',
                        borderTopColor: 'transparent',
                    }}></div>
                    <span>Loading editor...</span>
                </div>
            </div>
        );
    }

    const {
        ClassicEditor,
        Essentials,
        Paragraph,
        Bold,
        Italic,
        Heading,
        Link,
        List,
        BlockQuote,
        Indent,
        Alignment,
        Font,
        FontColor,
        FontBackgroundColor,
        Table,
        Image,
        ImageCaption,
        ImageStyle,
        ImageToolbar,
        ImageUpload,
        MediaEmbed,
    } = cloud.CKEditor;

    const { FormatPainter } = cloud.CKEditorPremiumFeatures;

    const config: any = {
        plugins: [
            Essentials,
            Paragraph,
            Bold,
            Italic,
            Heading,
            Link,
            List,
            BlockQuote,
            Indent,
            Alignment,
            Font,
            FontColor,
            FontBackgroundColor,
            Table,
            Image,
            ImageCaption,
            ImageStyle,
            ImageToolbar,
            ImageUpload,
            MediaEmbed,
            FormatPainter,
        ],
        toolbar: [
            'heading',
            '|',
            'bold',
            'italic',
            'link',
            '|',
            'bulletedList',
            'numberedList',
            '|',
            'blockQuote',
            'insertTable',
            '|',
            'alignment',
            '|',
            'fontColor',
            'fontBackgroundColor',
            '|',
            'undo',
            'redo',
            '|',
            'formatPainter',
        ],
        fontColor: {
            columns: 8,
            documentColors: 10,
        },
        fontBackgroundColor: {
            columns: 8,
            documentColors: 10,
        },
        heading: {
            options: [
                { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
                { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
                { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
            ],
        },
        placeholder,
    };

    // Add license key if available
    if (process.env.NEXT_PUBLIC_CKEDITOR_LICENSE_KEY) {
        config.licenseKey = process.env.NEXT_PUBLIC_CKEDITOR_LICENSE_KEY;
    }

    return (
        <div className="ckeditor-wrapper min-h-[220px] [&_.ck-editor__editable]:min-h-[180px]">
        <CKEditor
            editor={ ClassicEditor }
                data={ value }
                onReady={ (editor) => {
                    editorRef.current = editor;
                } }
                onChange={ (event, editor) => {
                    const data = editor.getData();
                    onChange?.(data);
                } }
                onBlur={ () => {
                    onBlur?.();
                } }
                config={ config }
        />
        </div>
    );
};

export default CustomEditor;
