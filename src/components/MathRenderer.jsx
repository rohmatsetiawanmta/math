// src/components/MathRenderer.jsx

import React, { useEffect, useRef } from "react";

const MathRenderer = ({ text }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    // Pastikan MathJax sudah dimuat
    if (window.MathJax && window.MathJax.Hub && containerRef.current) {
      // Memberitahu MathJax untuk memproses DOM
      window.MathJax.Hub.Queue([
        "Typeset",
        window.MathJax.Hub,
        containerRef.current,
      ]);
    }
  }, [text]);

  return <div ref={containerRef} dangerouslySetInnerHTML={{ __html: text }} />;
};

export default MathRenderer;
