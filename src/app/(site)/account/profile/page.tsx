import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { deleteAddress } from "../actions";
import { ProfileForm, AddressForm, DeleteAccountForm } from "./ProfileForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  const addresses = await prisma.savedAddress.findMany({ where: { userId: user.id } });
  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="mb-4 text-xl font-bold">Learner details</h2>
        <ProfileForm
          user={{
            name: user.name,
            email: user.email,
            phone: user.phone ?? "",
            licenceNumber: user.licenceNumber ?? "",
            licenceType: user.licenceType ?? "",
            testDate: user.testDate ? user.testDate.toISOString().slice(0, 10) : "",
            marketingOptIn: user.marketingOptIn,
          }}
        />
      </section>
      <section className="card">
        <h2 className="text-xl font-bold">Saved pickup addresses</h2>
        {addresses.length > 0 && (
          <ul className="mt-3 divide-y divide-line">
            {addresses.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <span><strong>{a.label}:</strong> {a.address}, {a.suburb}</span>
                <form action={deleteAddress}><input type="hidden" name="id" value={a.id} /><button className="btn-ghost btn-sm text-danger">Remove</button></form>
              </li>
            ))}
          </ul>
        )}
        <AddressForm />
      </section>
      <section className="card border-red-200">
        <h2 className="text-xl font-bold">Delete account</h2>
        <p className="mt-1 text-sm text-muted">
          This permanently deletes your login, saved addresses, package records and progress. Past booking records are kept without a link to your account where we must retain them for tax purposes (see our privacy policy).
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
