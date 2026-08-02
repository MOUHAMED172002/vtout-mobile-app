// Découpage territorial du Bénin (départements → communes), utilisé pour la
// sélection des zones de service du livreur. Portage 1:1 de
// frontend/src/utils/communes.js (site web) sur les mêmes données embarquées.
import territoireData from '../data/decoupage-territorial-benin.json';

// Retourne un tableau [{ departement: "ATLANTIQUE", communes: ["ABOMEY-CALAVI", ...] }, ...]
export const getCommunesParDepartement = () => {
  return (territoireData || []).map((dept) => ({
    departement: dept.lib_dep,
    communes: (dept.communes || []).map((c) => c.lib_com),
  }));
};

// Liste plate de toutes les communes, triée alphabétiquement.
export const getAllCommunes = () => {
  const communes = [];
  for (const dept of territoireData || []) {
    for (const com of dept.communes || []) {
      communes.push(com.lib_com);
    }
  }
  return communes.sort((a, b) => a.localeCompare(b, 'fr'));
};
