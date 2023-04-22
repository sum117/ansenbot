import { TextInputStyle } from "discord.js";

import { AnsenModal } from "../../Character/classes/AnsenModal";

const characterCreateModalRequired = new AnsenModal({
  customId: "createChar:modal:required",
  title: "Criação de Personagem | Campos Obrigatórios",
});

const characterCreateModalOptional = new AnsenModal({
  customId: "createChar:modal:optional",
  title: "Criação de Personagem | Campos Opcionais",
});

const characterNameField = AnsenModal.makeField({
  label: "Nome",
  required: true,
  placeholder: "Analillia",
  style: TextInputStyle.Short,
  customId: "createChar:modal:name",
  minLength: 3,
  maxLength: 64,
});

const characterSurnameField = AnsenModal.makeField({
  label: "Sobrenome",
  required: true,
  placeholder: "Frostmoon Del Arch",
  style: TextInputStyle.Short,
  customId: "createChar:modal:surname",
  minLength: 3,
  maxLength: 64,
});

const characterAgeField = AnsenModal.makeField({
  label: "Idade",
  required: true,
  placeholder: "Não digitar um número aqui irá resultar em um erro.",
  style: TextInputStyle.Short,
  customId: "createChar:modal:age",
  minLength: 1,
  maxLength: 3,
});

const characterGenderField = AnsenModal.makeField({
  label: "Gênero",
  required: true,
  placeholder: "Digite um gênero válido.",
  style: TextInputStyle.Short,
  customId: "createChar:modal:gender",
  minLength: 4,
  maxLength: 64,
});

const characterImageField = AnsenModal.makeField({
  label: "Imagem",
  required: true,
  placeholder: "https://i.imgur.com/0X0X0X0.png",
  style: TextInputStyle.Short,
  customId: "createChar:modal:image",
});

const characterProfessionField = AnsenModal.makeField({
  label: "Profissão",
  required: false,
  placeholder: "Uma pessoa que trabalha como um mercador.",
  style: TextInputStyle.Short,
  customId: "createChar:modal:profession",
});

const characterTitleField = AnsenModal.makeField({
  label: "Título",
  required: false,
  placeholder: "Rainha do Gelo",
  style: TextInputStyle.Short,
  customId: "createChar:modal:title",
});

const characterAppearanceField = AnsenModal.makeField({
  label: "Descrição Física",
  required: false,
  placeholder: "Uma pessoa bonita que tem um sorriso lindo.",
  style: TextInputStyle.Paragraph,
  customId: "createChar:modal:appearance",
  maxLength: 512,
  minLength: 128,
});

const characterBackstoryField = AnsenModal.makeField({
  label: "História do Personagem",
  required: false,
  placeholder: "Uma pessoa que nasceu em uma família rica e que sempre teve tudo o que queria.",
  style: TextInputStyle.Paragraph,
  customId: "createChar:modal:backstory",
});

const characterPersonalityField = AnsenModal.makeField({
  label: "Personalidade do Personagem",
  required: false,
  placeholder: "Uma pessoa que é muito gentil e que sempre ajuda os outros.",
  style: TextInputStyle.Paragraph,
  customId: "createChar:modal:personality",
  maxLength: 1024,
  minLength: 128,
});

characterCreateModalRequired.addFields([
  characterNameField,
  characterSurnameField,
  characterAgeField,
  characterGenderField,
  characterImageField,
]);

characterCreateModalOptional.addFields([
  characterProfessionField,
  characterTitleField,
  characterAppearanceField,
  characterBackstoryField,
  characterPersonalityField,
]);

export { characterCreateModalRequired, characterCreateModalOptional };
