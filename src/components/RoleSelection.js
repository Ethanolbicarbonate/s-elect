'use client';

import Link from 'next/link';

export default function RoleSelection() {
  return (
    <div className="flex-grow-1 d-flex flex-column align-items-center p-2">
      <div className="d-flex align-items-center w-75 h-50 custom-width-sm-min">
        <div className="d-flex flex-column gap-2 w-100">
          <Link href="/user-login" className="btn custom-btn fs-5 btn-lg text-secondary border shadow-sm">
            User
          </Link>
          <Link href="/admin-login" className="btn custom-btn fs-5 btn-lg text-secondary border shadow-sm">
            Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
