import React from "react";
import { Typography } from "@mui/material";
import { Box } from "@mui/system";

const ConfidentialityPolicy = () => {
  const confidentialityDetails = [
    {
      title: "Introduction",
      content: `Votre vie privée est une priorité pour nous. Cette Politique de Confidentialité explique quelles informations nous collectons, comment nous les utilisons et les protégeons.`,
    },
    {
      title: "Données collectées",
      content: `Nous collectons les informations suivantes :

                Utilisateur enregistré : Prénom, numéro de téléphone, adresse e-mail, historique des commandes.

                Client non enregistré : Prénom, numéro de téléphone, adresse e-mail (enregistrés uniquement dans l'historique des commandes).

                Paiements : Traités via Stripe, aucune information bancaire n'est stockée par nos soins.

                Authentification : Gérée par Auth0.`,
    },
    {
      title: "Utilisation des données",
      content: `Les informations collectées sont utilisées pour :

                Gérer et traiter les commandes.

                Améliorer l'expérience utilisateur.

                Communiquer avec les clients concernant leurs commandes.`,
    },
    {
      title: "Partage des données",
      content: `Vos informations ne sont pas partagées avec des tiers, sauf pour assurer les services essentiels (Stripe pour les paiements et Auth0 pour l’authentification).`,
    },
    {
      title: "Conservation des données",
      content: `Les données sont conservées tant que nécessaire pour la gestion des commandes et conformément à nos obligations légales.`,
    },
    {
      title: "Droits des utilisateurs",
      content: `Vous pouvez demander l’accès, la rectification ou la suppression de vos données en nous contactant.`,
    },
    {
      title: "Sécurité",
      content: `Nous mettons en place des mesures de sécurité pour protéger vos données contre tout accès non autorisé.`,
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
      {confidentialityDetails.map((item, index) => (
        <Box key={index} mb={2}>
          <Typography variant="h3">
            {index + 1}. {item.title}
          </Typography>
          <Typography variant="body1">{item.content} </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default ConfidentialityPolicy;
