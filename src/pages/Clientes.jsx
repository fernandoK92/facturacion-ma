import { PageHeader, EmptyState } from "../components/ui";

export default function Clientes() {
  return (
    <div>
      <PageHeader title="Clientes" subtitle="Directorio de clientes" />
      <EmptyState
        icon="👥"
        title="En construcción"
        hint="Por ahora los datos del cliente se capturan al cobrar en la Terminal POS. El directorio de clientes llega con la base de datos."
      />
    </div>
  );
}
