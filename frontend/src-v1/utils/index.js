import validator from "validator";

export function validateField(name, value) {
  let isValid = true;
  let message = "";

  switch (name) {
    case "firstName":
      if (!value.trim()) {
        isValid = false;
        message = "Le prénom est requis";
      }
      break;

    case "lastName":
      if (!value.trim()) {
        isValid = false;
        message = "Le nom est requis";
      }
      break;

    case "phone":
      if (!value.trim()) {
        isValid = false;
        message = "Le numéro de téléphone est requis";
      } else if (!validator.isMobilePhone(value)) {
        isValid = false;
        message = "Format de numéro de téléphone invalide";
      }
      break;

    case "email":
      if (!value.trim()) {
        isValid = false;
        message = "L'adresse e-mail est requise";
      } else if (!validator.isEmail(value)) {
        isValid = false;
        message = "Format d'adresse e-mail invalide";
      }
      break;

    default:
      break;
  }

  return { isValid, message };
}

export function validateForm(formData, setErrors, setErrorMessages) {
  let isValid = true;
  const newErrors = {};
  const newErrorMessages = {};

  Object.keys(formData).forEach((field) => {
    const { isValid: fieldIsValid, message } = validateField(
      field,
      formData[field]
    );
    newErrors[field] = !fieldIsValid;
    newErrorMessages[field] = message;
    if (!fieldIsValid) isValid = false;
  });

  setErrors(newErrors);
  setErrorMessages(newErrorMessages);
  return isValid;
}
