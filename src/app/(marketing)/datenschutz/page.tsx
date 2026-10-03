import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/features/legal/legal-page";

export const metadata: Metadata = {
  title: "Datenschutzerklärung · jobrador",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Datenschutzerklärung"
      lede="jobrador is a free experiment, not a business. This notice says what the project stores. There are no ads, no sale of data, and no analytics tracker."
    >
      <LegalSection title="Wer das Projekt führt">
        <p>
          jobrador ist ein nicht-kommerzielles Experiment ohne Umsatz und ohne Geschäftsadresse. Fragen
          zu personenbezogenen Daten gehen an{" "}
          <a className="underline underline-offset-4" href="mailto:info@grahmind.com">info@grahmind.com</a>.
        </p>
      </LegalSection>
      <LegalSection title="Aufruf der Website">
        <p>
          Beim Öffnen verarbeitet der Server, was nötig ist, um die Seite auszuliefern: IP-Adresse,
          Zeitpunkt, aufgerufene Adresse und die üblichen Angaben des Browsers. Das passiert, damit die
          Seite funktioniert und nicht missbraucht wird. Daraus wird kein Profil gebaut.
        </p>
      </LegalSection>
      <LegalSection title="Konto">
        <p>
          Die Karte hinter dem Login braucht eine E-Mail-Adresse und ein Passwort. Die Anmeldung läuft
          über Supabase. Supabase speichert die Zugangsdaten und die Sitzung. Das Passwort liegt dort,
          nicht im Klartext bei jobrador. Das Konto ist nur der Zugang zur Karte. Es ist kein Kundenkonto
          und es wird nichts berechnet.
        </p>
        <p>
          Gemerkte Jobs und die Besuchsliste bleiben in diesem Browser. Sie werden nicht als Kontodaten
          an den Server geschickt.
        </p>
      </LegalSection>
      <LegalSection title="Student Wall">
        <p>
          Eine Notiz auf der Startseite braucht kein Konto. Der Browser legt eine zufällige Kennung an
          und speichert sie lokal. Mit der Notiz speichern wir den Vornamen, den Text, die Farbe und
          diese Kennung. Eine Reaktion speichert das gewählte Emoji. Die Notiz ist öffentlich. Pro
          Browser ist eine Notiz möglich.
        </p>
        <p>
          Die Kennung bleibt im Browser, bis die Website-Daten gelöscht werden. Die Notiz bleibt
          sichtbar, bis sie auf Anfrage an info@grahmind.com entfernt wird. Eine Löschfunktion in der
          Seite gibt es noch nicht.
        </p>
      </LegalSection>
      <LegalSection title="Hinweise, Standort und Suche">
        <p>
          Wer einen Hinweis meldet, sendet den Namen des Orts, eine Beschreibung, die Art der Arbeit,
          eine Kategorie und einen Standort. Das kann als blauer Pin auf der Karte erscheinen.
        </p>
        <p>
          Ein Gerätestandort wird nur abgefragt, wenn jemand das selbst wählt. Der Browser fragt dann um
          Erlaubnis. Eine Postleitzahl oder ein Ortsname geht an die jobrador-Schnittstelle. Der Server
          fragt damit Nominatim von OpenStreetMap, um den Ort in Berlin zu finden.
        </p>
      </LegalSection>
      <LegalSection title="Karte">
        <p>
          Die Karte lädt Kacheln im Browser von OpenFreeMap. Dabei kann die IP-Adresse dort ankommen.
          Die Kartendaten stammen von OpenStreetMap.
        </p>
      </LegalSection>
      <LegalSection title="Kein Geschäft mit Daten">
        <p>
          Es gibt keine Werbung, keinen Verkauf von Daten und kein Reichweiten-Tracking. Die Sitzung der
          Anmeldung und die Kennung der Student Wall liegen im lokalen Speicher des Browsers.
        </p>
      </LegalSection>
      <LegalSection title="Passwort und Fehlermeldungen">
        <p>
          Wer ein neues Passwort anfordert, bekommt eine E-Mail mit einem Link. Die Adresse muss zu einem
          Konto gehören. Wer einen Fehler meldet, sendet den Text und, wenn angegeben, eine E-Mail und
          die Seite. Die Nachricht geht an die Personen, die das Projekt betreiben. Sie wird nicht in
          der Datenbank der Jobangebote gespeichert.
        </p>
      </LegalSection>
      <LegalSection title="Rechte">
        <p>
          Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch können
          per E-Mail verlangt werden, soweit die Voraussetzungen erfüllt sind. Eine Einwilligung, etwa
          beim Abschicken einer Notiz, kann widerrufen werden.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
