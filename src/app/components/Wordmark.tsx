import { brand } from "@/lib/brand";

export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`}>
      <span className="wordmark-bold">{brand.bold}</span>
      <span className="wordmark-light">{brand.light}</span>
    </span>
  );
}
