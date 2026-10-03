import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/features/legal/legal-page";

export const metadata: Metadata = {
  title: "Impressum · jobrador",
};

export default function ImpressumPage() {
  return (
    <LegalPage
      title="Impressum"
      lede="jobrador is a free experiment that helps people look for student work nearby. It is not a business. It takes no money and has no revenue, and it has no business address."
    >
      <LegalSection title="Was das ist">
        <p>
          jobrador ist ein nicht-kommerzielles Projekt. Es ist ein Versuch, Studentenjobs, Minijobs und
          Orte in der Nähe auf einer Karte zu zeigen. Dahinter steht kein Unternehmen, das damit Geld
          verdient. Es gibt kein Entgelt, keine Werbung und keinen Umsatz.
        </p>
        <p>
          Gebaut wurde es als Hilfsprojekt von{" "}
          <a className="underline underline-offset-4" href="https://www.grahmind.com/" target="_blank" rel="noreferrer">
            Grahmind Innovations
          </a>
          . Das ist die Herkunft des Projekts, nicht ein Geschäftssitz von jobrador.
        </p>
      </LegalSection>
      <LegalSection title="Kontakt">
        <p>
          Eine Geschäftsadresse gibt es nicht. Fragen zum Projekt gehen an{" "}
          <a className="underline underline-offset-4" href="mailto:info@grahmind.com">info@grahmind.com</a>.
        </p>
      </LegalSection>
      <LegalSection title="Inhalte">
        <p>
          Ein grüner Pin ist eine öffentliche Stellenanzeige, die wir öffnen können. Ein gelber Pin
          bedeutet, dass wir nachgesehen und keine öffentliche Stelle gefunden haben. Ein blauer Pin ist
          ein Hinweis von einer Person. Ein grauer Pin ist noch nicht geprüft. Nichts davon ist ein
          Arbeitsangebot.
        </p>
        <p>
          Notizen auf der Startseite und gemeldete Hinweise schreiben die Personen selbst. Sie werden
          nicht vorher geprüft.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
