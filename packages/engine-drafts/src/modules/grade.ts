export interface Grade {
  /** 0–1; null = এই তথ্য নেই (স্কোর/কনফিডেন্সে ধরা হয় না, শাস্তিও দেয় না) */
  value: number | null;
  note: string;
}
