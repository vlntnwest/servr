import Link from "next/link";
import {
  ShoppingBag,
  Clock,
  CreditCard,
  Users,
  BarChart3,
  Zap,
} from "lucide-react";

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-screen-xl mx-auto px-5 sm:px-7 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-0">
            <span className="font-display text-logo-sm leading-none tracking-tighter text-foreground">
              Servr
            </span>
            <span className="font-display text-logo-sm leading-none text-primary">
              .
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="font-sans font-medium text-body-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-pill bg-foreground text-background px-5 h-10 font-sans font-medium text-body-sm tracking-cta hover:opacity-90 transition-opacity shadow-sm shadow-black/5"
            >
              Commencer
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-screen-xl mx-auto px-5 sm:px-7 py-24 sm:py-32 text-center">
          <p className="font-sans font-medium text-caption uppercase tracking-eyebrow text-muted-foreground mb-6">
            Pour restaurants & cafés
          </p>
          <h1 className="font-display text-display-sm sm:text-display lg:text-[64px] tracking-tighter leading-[0.95] max-w-3xl mx-auto text-foreground text-balance">
            La commande en ligne
            <span className="text-primary">.</span> pour
            <br className="hidden sm:block" />
            <span className="italic">votre restaurant</span>
          </h1>
          <p className="mt-8 text-body sm:text-principle text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Créez votre page de commande en quelques minutes. Gérez vos
            produits, commandes et paiements depuis un seul tableau de bord.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-pill bg-primary text-primary-foreground px-7 h-12 font-sans font-medium text-body tracking-cta hover:bg-primary/90 transition-colors shadow-sm shadow-black/5"
            >
              Créer mon restaurant
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-pill border border-border bg-background px-7 h-12 font-sans font-medium text-body tracking-cta hover:bg-secondary transition-colors"
            >
              Se connecter
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-border bg-card">
          <div className="max-w-screen-xl mx-auto px-5 sm:px-7 py-20">
            <div className="text-center mb-14">
              <p className="font-sans font-medium text-caption uppercase tracking-eyebrow text-muted-foreground mb-3">
                Fonctionnalités
              </p>
              <h2 className="font-display text-display-sm sm:text-[40px] tracking-tighter leading-none text-foreground text-balance">
                Tout ce dont vous avez besoin
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-card border border-brand-border bg-background p-6 shadow-sm shadow-black/5"
                >
                  <div className="w-12 h-12 rounded-icon bg-primary/10 flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-sans font-semibold text-card-name leading-tight mb-2 text-foreground">
                    {title}
                  </h3>
                  <p className="text-body-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-screen-xl mx-auto px-5 sm:px-7 py-24 text-center">
          <h2 className="font-display text-display-sm sm:text-[40px] tracking-tighter leading-none text-foreground mb-5 text-balance">
            Prêt à digitaliser
            <span className="text-primary">.</span>
          </h2>
          <p className="text-body text-muted-foreground mb-10 max-w-md mx-auto">
            Inscription gratuite. Configurez votre menu et commencez à recevoir
            des commandes en quelques minutes.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-pill bg-foreground text-background px-8 h-12 font-sans font-medium text-body tracking-cta hover:opacity-90 transition-opacity shadow-sm shadow-black/5"
          >
            Commencer gratuitement
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-screen-xl mx-auto px-5 sm:px-7 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-display text-principle leading-none tracking-tighter text-foreground">
            Servr<span className="text-primary">.</span>
          </span>
          <p className="text-action text-muted-foreground">
            Commande en ligne pour restaurants
          </p>
        </div>
      </footer>
    </div>
  );
}
