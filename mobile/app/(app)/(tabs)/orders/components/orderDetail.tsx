import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { BRAND } from "@/lib/constants";
import {
  formatEuros,
  getOrderStatusBadge,
  getOrderStatusLabel,
  getStatusActions,
} from "@/lib/utils";
import { Order } from "@/types/api";
import { ScrollView, View } from "react-native";
import OrderOptions from "./orderOptions";
import { usePrinter } from "@/context/printer";

type Props = {
  order: Order;
  updating: boolean;
  onStatusChange: (targetStatus: string) => void;
};

export default function OrderDetail({
  order,
  updating,
  onStatusChange,
}: Props) {
  const { bg, text } = getOrderStatusBadge(order.status);
  const actions = getStatusActions(order.status);
  const { printOrder } = usePrinter();

  const createdAt = new Date(order.createdAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handlePrint = () => {
    printOrder(order);
  };

  return (
    <ScrollView contentContainerClassName="px-5 py-14 gap-5">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <Text
          className="font-display text-logo-sm leading-none text-foreground"
          style={{ letterSpacing: -0.28 }}
        >
          #{order.orderNumber ?? "—"}
        </Text>
        <Badge className={`${bg} border-transparent px-4 py-1`}>
          <Text
            variant="badge"
            className={text}
            style={{ letterSpacing: 0.52 }}
          >
            {getOrderStatusLabel(order.status)}
          </Text>
        </Badge>
      </View>

      <Separator />

      {/* On-site payment notice */}
      {order.status === "PENDING_ON_SITE_PAYMENT" && (
        <View
          className="flex-row items-center gap-3 rounded-card px-4 py-3"
          style={{ backgroundColor: BRAND.orange + "20" }}
        >
          <Text className="text-lg">💳</Text>
          <View className="flex-1">
            <Text
              className="font-sans-semibold text-body-sm"
              style={{ color: BRAND.orange }}
            >
              Paiement à régler au retrait
            </Text>
            <Text className="text-body-sm text-muted-foreground">
              Le client paiera {formatEuros(parseFloat(order.totalPrice))} sur place
            </Text>
          </View>
        </View>
      )}

      {/* Client */}
      <View className="gap-1">
        <Text variant="caption" className="text-muted-foreground">
          Client
        </Text>
        <Text className="font-sans-semibold text-foreground">
          {order.fullName ?? "Client inconnu"}
        </Text>
        {order.phone && <Text variant="muted">{order.phone}</Text>}
        {order.email && <Text variant="muted">{order.email}</Text>}
      </View>

      <Separator />

      {/* Articles */}
      <View className="gap-3">
        <Text variant="caption" className="text-muted-foreground">
          Articles
        </Text>
        {order.orderProducts.map((op) => (
          <View key={op.id}>
            <Text className="font-sans-medium text-foreground">
              {op.quantity}× {op.product.name}
            </Text>
            <OrderOptions options={op.orderProductOptions} />
          </View>
        ))}
      </View>

      <Separator />

      {/* Total */}
      <View className="flex-row justify-between items-center">
        <Text className="font-sans-semibold text-foreground">Total</Text>
        <Text className="font-sans-semibold text-foreground">
          {formatEuros(parseFloat(order.totalPrice))}
        </Text>
      </View>

      <Separator />

      {/* Méta */}
      <View className="gap-2">
        <View className="flex-row justify-between items-center">
          <Text variant="muted">Date</Text>
          <Text variant="muted" className="font-sans-medium">
            {createdAt}
          </Text>
        </View>
        {order.scheduledFor && (
          <View className="flex-row justify-between items-center">
            <Text variant="muted">Prévu pour</Text>
            <Text
              className="font-sans-medium text-sm"
              style={{ color: BRAND.orange }}
            >
              {new Date(order.scheduledFor).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {actions.length > 0 && (
        <>
          <Separator />
          <View className="flex-row gap-2">
            {actions.map((action) => (
              <Button
                key={action.targetStatus}
                variant={action.variant}
                className="flex-1"
                disabled={updating}
                onPress={() => onStatusChange(action.targetStatus)}
              >
                <Text>{updating ? "En cours…" : action.label}</Text>
              </Button>
            ))}
          </View>
        </>
      )}

      {actions.length > 0 && <Separator />}
      <View>
        <Button variant="link" onPress={handlePrint}>
          <Text>Imprimer</Text>
        </Button>
      </View>
    </ScrollView>
  );
}
