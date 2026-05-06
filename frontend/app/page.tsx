import Link from "next/link";
import { ShoppingBag, Clock, CreditCard, Users, BarChart3, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: ShoppingBag,
    title: "Commande en ligne",
    description:
      "Vos clients commandent depuis leur téléphone. Menu, options, panier — tout est fluide.",
  },
  {
    icon: CreditCard,
    title: "Paiement intégré",
    description:
      "Acceptez les paiements par carte via Stripe ou optez pour le paiement sur place.",
  },
  {
    icon: Clock,
    title: "Temps réel",
    description:
      "Recevez les commandes instantanément. Mettez à jour les statuts en un clic.",
  },
  {
    icon: Users,
    title: "Gestion d'équipe",
    description:
      "Invitez vos collaborateurs avec des rôles différents : propriétaire, admin ou staff.",
  },
  {
    icon: BarChart3,
    title: "Statistiques",
    description:
      "Suivez votre chiffre d'affaires, vos produits populaires et le volume de commandes.",
  },
  {
    icon: Zap,
    title: "Simple et rapide",
    description:
      "Créez votre restaurant, configurez vos horaires et produits, et commencez à recevoir des commandes.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="border-b border-border">
        <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-primary">Servr</span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-black transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Commencer
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero section */}
        <section className="max-w-screen-xl mx-auto px-4 py-20 sm:py-32 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
            La commande en ligne pour votre restaurant
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
            Créez votre page de commande en quelques minutes. Gérez vos produits,
            commandes et paiements depuis un seul tableau de bord.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Créer mon restaurant
            </Link>
            <Link
              href="/login"
              className="border border-border px-6 py-3 rounded-lg font-medium hover:bg-muted transition-colors"
            >
              Se connecter
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="bg-muted/50 border-y border-border py-20">
          <div className="max-w-screen-xl mx-auto px-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
              Tout ce dont vous avez besoin
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="bg-white border border-brand-border rounded-lg p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-screen-xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Prêt à digitaliser votre restaurant ?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Inscription gratuite. Configurez votre menu et commencez à recevoir
            des commandes en quelques minutes.
          </p>
          <Link
            href="/register"
            className="inline-block bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Commencer gratuitement
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-screen-xl mx-auto px-4 text-center text-sm text-muted-foreground">
          Servr — Commande en ligne pour restaurants
        </div>
      </footer>
    </div>
  );
}
