import React from "react";
import { Typography } from "@mui/material";
import { Box } from "@mui/system";

const GeneralConditions = () => {
  const cguDetails = [
    {
      title: "Objet",
      content: `Les présentes CGU définissent les conditions d'utilisation de l'application de Click and Collect.`,
    },
    {
      title: "Accès et Inscription",
      content: `L'accès à l'application est libre. L'inscription est nécessaire pour accéder à certaines fonctionnalités comme la gestion de l'historique des commandes. Lors de l'inscription, l'utilisateur doit accepter les présentes CGU et la Politique de Confidentialité.`,
    },
    {
      title: "Acceptation des Conditions",
      content: `L'inscription ou l'utilisation des services implique l'acceptation pleine et entière des CGU et de la Politique de Confidentialité. L'utilisateur doit cocher une case d'acceptation avant la création de son compte.`,
    },
    {
      title: "Utilisation des Services",
      content: `Les utilisateurs s’engagent à fournir des informations exactes lors de l'inscription ou de la commande, et à ne pas utiliser le service à des fins frauduleuses ou malveillantes.`,
    },
    {
      title: "Responsabilité",
      content: `Nous mettons tout en œuvre pour assurer la disponibilité du service, mais nous ne pouvons être tenus responsables des interruptions, erreurs ou dommages directs ou indirects liés à l'utilisation de l'application.`,
    },
    {
      title: "Modification des CGU",
      content: `Nous nous réservons le droit de modifier les CGU à tout moment. Les utilisateurs seront informés des modifications lors de leur prochaine connexion.`,
    },
  ];
  const cgvDetails = [
    {
      title: "Objet",
      content: `Les présentes CGV encadrent les conditions de vente des produits commandés via notre application de Click and Collect.`,
    },
    {
      title: "Produits et Disponibilité",
      content: `Les produits proposés à la vente sont ceux affichés dans l'application, dans la limite des stocks disponibles.`,
    },
    {
      title: "Commandes",
      content: `Toute commande passée via l'application est considérée comme ferme et définitive une fois validée. Pour les clients non enregistrés, les informations personnelles (prénom, numéro de téléphone, e-mail) sont collectées uniquement pour traiter la commande.`,
    },
    {
      title: "Paiement",
      content: `Les paiements s’effectuent en ligne via Stripe ou d'autres moyens mis à disposition. Aucune information bancaire n'est stockée par notre application. La transaction est sécurisée par le prestataire de paiement.`,
    },
    {
      title: "Livraison / Retrait",
      content: `Les produits sont à retirer dans le point de vente choisi lors de la commande, à l'heure indiquée. Aucun service de livraison n'est proposé.`,
    },
    {
      title: "Annulation et Remboursement",
      content: `Aucune annulation ou remboursement n'est possible une fois la commande validée, sauf en cas d'erreur manifeste de notre part ou de force majeure.`,
    },
    {
      title: "Responsabilité",
      content: `Nous déclinons toute responsabilité en cas de problèmes liés à des services tiers (Stripe, Auth0, etc.).`,
    },
    {
      title: "Litiges",
      content: `Les présentes CGV sont régies par la loi française. En cas de litige, une solution amiable sera recherchée avant toute action judiciaire. À défaut, les tribunaux compétents seront saisis.`,
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "left",
        textAlign: "left",
        padding: 2,
      }}
    >
      <Box mb={3}>
        <Typography variant="h2" mb={3}>
          Conditions Générales d'Utilisation
        </Typography>
        {cguDetails.map((item, index) => (
          <Box key={index} mb={3}>
            <Typography variant="h3">
              {index + 1}. {item.title}
            </Typography>
            <Typography variant="body1">{item.content} </Typography>
          </Box>
        ))}
      </Box>
      <Box mb={3}>
        <Typography variant="h2" mb={3}>
          Conditions Générales de Vente
        </Typography>
        {cgvDetails.map((item, index) => (
          <Box key={index} mb={3}>
            <Typography variant="h3">
              {index + 1}. {item.title}
            </Typography>
            <Typography variant="body1">{item.content} </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default GeneralConditions;
