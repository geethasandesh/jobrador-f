import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/features/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms · jobrador",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Nutzungsbedingungen"
      lede="jobrador is a free experiment to help people look nearby. It is not a business, it charges nothing, and it does not hire anyone. The German text is the version that applies."
    >
      <LegalSection title="Ein Versuch, keine Firma">
        <p>
          jobrador ist ein nicht-kommerzielles Projekt. Es nimmt kein Geld ein, zeigt keine Werbung und
          hat keine Geschäftsadresse. Es kann sich ändern oder aufhören, weil es ein Experiment ist.
        </p>
        <p>
          Die Karte zeigt Studentenjobs, Minijobs, Werkstudentenstellen und Orte in der Nähe in Berlin.
          Ein grüner Pin ist eine öffentliche Stellenanzeige, die wir öffnen können. Ein gelber Pin
          bedeutet, dass wir nachgesehen und keine öffentliche Stelle gefunden haben. Ein blauer Pin ist
          ein Hinweis, den jemand gemeldet hat. Ein grauer Pin ist noch nicht geprüft.
        </p>
        <p>
          Kein Pin ist ein Arbeitsvertrag oder die Zusage, dass ein Betrieb gerade einstellt. Gehalt und
          Arbeitszeit stehen nur da, wenn sie in einer echten Anzeige stehen.
        </p>
      </LegalSection>
      <LegalSection title="Konto">
        <p>
          Die Karte hinter dem Login braucht ein Konto mit E-Mail und Passwort. Das Konto kostet nichts.
          Gemerkte Jobs und die Besuchsliste bleiben auf diesem Gerät.
        </p>
      </LegalSection>
      <LegalSection title="Was Menschen selbst schreiben">
        <p>
          Eine Notiz auf der Startseite ist sofort öffentlich. Ein Browser kann eine Notiz anbringen. Der
          Text darf keinen Link, keine Telefonnummer und keine privaten Daten einer anderen Person
          enthalten. Ein Hinweis zu einem Betrieb beschreibt, was die Person selbst gesehen hat. Er ist
          kein geprüfter Nachweis.
        </p>
        <p>
          Eine Notiz oder ein Hinweis kann entfernt werden, wenn die Regeln verletzt sind. Eine Löschung
          kann auch über info@grahmind.com verlangt werden.
        </p>
      </LegalSection>
      <LegalSection title="Keine Zusage">
        <p>
          Stellen und Websites ändern sich. Das Projekt übernimmt keine Gewähr, dass ein Pin noch stimmt,
          wenn jemand dort ankommt. Es ist eine Hilfe beim Suchen, kein Angebot und kein Vertrag.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
