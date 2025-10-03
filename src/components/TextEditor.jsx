// src/components/TextEditor.jsx

import React from "react";
import { List, ListOrdered, ImagePlus } from "lucide-react";

/**
 * Custom Text Editor component that includes a formatting toolbar.
 * It passes complex handlers (onInsertTable/onInsertDS) from parent.
 */
const TextEditor = ({
  name,
  value,
  onChange,
  onInsertImage,
  onInsertTable,
  onInsertDS,
  rows = "10",
  placeholder = "",
}) => {
  const handleInsert = (textToInsert) => {
    // Mengambil elemen textarea menggunakan nama (name)
    const textarea = document.getElementsByName(name)[0];
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Menyisipkan teks
    const newText =
      value.substring(0, start) + textToInsert + value.substring(end);

    // Panggil onChange (seperti yang dilakukan React untuk input)
    onChange({ target: { name, value: newText } });

    // Coba kembalikan kursor ke posisi yang benar setelah teks disisipkan
    // Menggunakan setTimeout untuk memastikan DOM diperbarui oleh React
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd =
        start + textToInsert.length;
      textarea.focus();
    }, 0);
  };

  // Handler untuk pemformatan sederhana
  const handleInsertBold = () => handleInsert("**teks**");
  const handleInsertItalic = () => handleInsert("*teks*");
  const handleInsertUnderline = () => handleInsert("<u>teks</u>");
  const handleInsertBulletList = () =>
    handleInsert(
      '\n<ul style="list-style-type: disc; margin-left:1em"><li>...</li><li>...</li></ul>'
    );
  const handleInsertNumberedList = () =>
    handleInsert(
      '\n<ol style="list-style-type: decimal; margin-left:1em"><li>...</li><li>...</li></ol>'
    );

  const isQuestionEditor = name === "question_text";

  return (
    <div className="flex flex-col">
      <textarea
        name={name}
        value={value || ""}
        onChange={onChange}
        className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none"
        rows={rows}
        placeholder={placeholder}
        required
      />
      <div className="flex gap-2 mt-2 flex-wrap">
        <button
          type="button"
          onClick={onInsertImage}
          className="rounded-md bg-gray-200 p-2 text-gray-700 hover:bg-gray-300"
          aria-label="Unggah Gambar"
        >
          <ImagePlus size={20} />
        </button>

        {isQuestionEditor && (
          <>
            {/* Tombol P-Q dan DS hanya ada di editor soal */}
            <button
              type="button"
              onClick={onInsertTable}
              className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 text-sm"
            >
              P-Q
            </button>
            <button
              type="button"
              onClick={onInsertDS}
              className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 text-sm font-semibold"
              title="Insert Data Sufficiency Template"
            >
              DS
            </button>
          </>
        )}

        {/* Tombol Pemformatan Teks Sederhana */}
        <button
          type="button"
          onClick={handleInsertBold}
          className="font-serif rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 text-sm font-bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={handleInsertItalic}
          className="font-serif rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 text-sm italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={handleInsertUnderline}
          className="font-serif rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 text-sm underline"
        >
          U
        </button>
        <button
          type="button"
          onClick={handleInsertBulletList}
          className="rounded-md bg-gray-200 px-2 py-2 text-gray-700 hover:bg-gray-300"
        >
          <List size={20} />
        </button>
        <button
          type="button"
          onClick={handleInsertNumberedList}
          className="rounded-md bg-gray-200 px-2 py-2 text-gray-700 hover:bg-gray-300"
        >
          <ListOrdered size={20} />
        </button>
      </div>
    </div>
  );
};

export default TextEditor;
