import { isRedColor } from "@/utils/utils";
import { motion } from "framer-motion";

export const Card = ({ index, card, className, ...props }) => {
  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative w-20 h-24 bg-gray-200 rounded-lg shadow-md mx-2 select-none ${className}`}
      {...props}
    >
      <div
        className={`absolute top-1 left-1 ${
          isRedColor(card?.color) ? "text-red-700" : "text-black"
        } text-xs font-bold`}
      >
        {card?.num}
      </div>
      <div
        className={`flex items-center justify-center h-full text-4xl ${
          isRedColor(card?.color) ? "text-red-500" : "text-black"
        }`}
      >
        {card?.color}
      </div>
      <div
        className={`absolute bottom-1 right-1 ${
          isRedColor(card?.color) ? "text-red-500" : "text-black"
        } text-xs font-bold`}
      >
        {card?.num}
      </div>
    </motion.div>
  );
};
