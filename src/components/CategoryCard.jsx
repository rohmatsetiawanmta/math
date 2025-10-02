// src/components/CategoryCard.jsx
import { Link } from "react-router-dom";

// Menambahkan prop 'basePath' dengan nilai default '/latsol'
const CategoryCard = ({ category, basePath = "/latsol" }) => {
  return (
    <Link
      // Menggunakan basePath untuk membuat tautan dinamis
      to={`${basePath}/${category.category_id}`}
      className="flex flex-col items-center justify-center rounded-lg border-2 border-transparent bg-white p-6 text-center shadow-md transition-all duration-300 hover:border-blue-500 hover:shadow-xl"
    >
      <h3 className="mb-2 text-2xl font-bold text-gray-800">
        {category.category_name}
      </h3>
      <p className="text-gray-600">{category.description}</p>
    </Link>
  );
};

export default CategoryCard;
