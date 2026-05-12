export default function LegalPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-8">Mentions légales</h1>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Éditeur du site</h2>
          <p className="text-muted-foreground leading-relaxed">
            Studio Valentin Westermeyer<br />
            Auto-entrepreneur<br />
            SIRET : 813 266 699 00012<br />
            Adresse : [à compléter]<br />
            Email : <a href="mailto:hello@my-spots.fr" className="underline">hello@my-spots.fr</a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Directeur de la publication</h2>
          <p className="text-muted-foreground">
            Valentin Westermeyer
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Hébergement</h2>
          <p className="text-muted-foreground leading-relaxed">
            Vercel Inc.<br />
            340 Pine Street, Suite 701<br />
            San Francisco, CA 94104, États-Unis<br />
            <a href="https://vercel.com" className="underline" target="_blank" rel="noopener noreferrer">vercel.com</a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Propriété intellectuelle</h2>
          <p className="text-muted-foreground leading-relaxed">
            L'ensemble des contenus présents sur le site my-spots.fr (textes, images, graphismes, logo) est la propriété exclusive de Studio Valentin Westermeyer, sauf mention contraire. Toute reproduction, représentation, modification ou exploitation sans autorisation préalable est interdite.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Données personnelles</h2>
          <p className="text-muted-foreground leading-relaxed">
            Les données personnelles collectées sur ce site (adresse email, nom, numéro de téléphone) sont utilisées uniquement dans le cadre du service de commande en ligne. Elles ne sont pas cédées à des tiers à des fins commerciales.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour exercer ces droits, contactez-nous à{" "}
            <a href="mailto:hello@my-spots.fr" className="underline">hello@my-spots.fr</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Cookies</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ce site utilise des cookies techniques nécessaires à son fonctionnement (authentification, session). Aucun cookie de traçage publicitaire n'est utilisé.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Contact</h2>
          <p className="text-muted-foreground">
            Pour toute question : <a href="mailto:hello@my-spots.fr" className="underline">hello@my-spots.fr</a>
          </p>
        </section>
      </div>
    </div>
  );
}
