// src/components/TeoriBox.jsx
import MathRenderer from "./MathRenderer";

const TeoriBox = ({ content }) => {
  return (
    <div className="rounded-lg border-l-4 border-red-500 bg-red-50 py-3 px-4 shadow-md mt-4">
      <h4 className="text-lg font-bold text-red-700">Ingat!</h4>
      <div className="prose max-w-none text-red-900">
        <MathRenderer text={content} />
      </div>
    </div>
  );
};

export default TeoriBox;
