import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  showInfo?: boolean;
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 20,
  showInfo = true,
}: PaginationProps) => {
  const { t } = useI18n();
  
  const maxVisiblePages = 5;
  
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || currentPage * itemsPerPage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 py-8"
    >
      {showInfo && totalItems && (
        <p className="text-sm text-muted-foreground">
          {startItem} - {endItem} sur {totalItems} résultats
        </p>
      )}
      
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="h-9 w-9 rounded-lg border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-9 w-9 rounded-lg border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1 mx-2">
          {getPageNumbers().map((page, index) => (
            typeof page === 'number' ? (
              <motion.button
                key={`page-${page}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onPageChange(page)}
                className={`h-9 w-9 rounded-lg text-sm font-medium transition-all ${
                  currentPage === page
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                {page}
              </motion.button>
            ) : (
              <span
                key={`ellipsis-${index}`}
                className="w-9 text-center text-muted-foreground"
              >
                ...
              </span>
            )
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-9 w-9 rounded-lg border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="h-9 w-9 rounded-lg border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Page {currentPage} sur {totalPages}
      </p>
    </motion.div>
  );
};
