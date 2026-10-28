export const cardColors = {
 brand:{bar:'bg-primary',soft:'bg-primary/15',text:'text-primary',label:'Azul'},
 accent:{bar:'bg-accent',soft:'bg-accent/15',text:'text-accent',label:'Verde'},
 warn:{bar:'bg-warning',soft:'bg-warning/15',text:'text-warning',label:'Amarelo'},
 danger:{bar:'bg-danger',soft:'bg-danger/15',text:'text-danger',label:'Rosa'},
 violet:{bar:'bg-card-violet',soft:'bg-card-violet/15',text:'text-card-violet',label:'Roxo'},
} as const;
export function colorOf(key: string) { return cardColors[key as keyof typeof cardColors] ?? cardColors.brand; }
