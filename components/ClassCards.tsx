import { Icon, WhatsAppIcon } from "@/components/icons";
import ContactTeacher from "@/components/ContactTeacher";

const SCHEDULE = [
  { g: 6, day: "Wednesday", time: "5.30 PM – 7.30 PM" },
  { g: 7, day: "Friday", time: "3.30 PM – 5.30 PM" },
  { g: 8, day: "Thursday", time: "5.30 PM – 7.30 PM" },
  { g: 9, day: "Wednesday", time: "3.30 PM – 5.30 PM" },
  { g: 10, day: "Friday", time: "5.30 PM – 7.30 PM" },
  { g: 11, day: "Thursday", time: "3.30 PM – 5.30 PM" },
];

const MAP_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3961.3962386021944!2d79.92325187386669!3d6.843009819370257!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae2510c0393fb8b%3A0x676d838b86e675cc!2sDasatha%20Institute!5e0!3m2!1sen!2slk!4v1786856287172!5m2!1sen!2slk";
const DIRECTIONS_URL = "https://share.google/SKFp0n7RfwNtaj5mp";

export default function ClassCards() {
  return (
    <section className="section-tight" id="classes">
      <div className="sec-head">
        <span className="eyebrow">Classes</span>
        <h2>Group or one-on-one, your way</h2>
        <p>Batch classes at Dasatha Institute, or private classes arranged around you.</p>
      </div>

      <div className="class-grid">
        <div className="card class-card">
          <div className="cc-head">
            <div className="cc-ic">
              <Icon name="grad" size={20} />
            </div>
            <div>
              <div className="cc-title">Group classes</div>
              <div className="cc-sub">Tuition batches · Grades 6–11</div>
            </div>
          </div>

          <p className="cc-note">
            Held at <b>Dasatha Institute</b> — weekly batches for every grade.
          </p>

          <div className="sched">
            {SCHEDULE.map((r) => (
              <div className="sched-row" key={r.g}>
                <span className="sched-g">Grade {r.g}</span>
                <span className="sched-day">{r.day}</span>
                <span className="sched-time">{r.time}</span>
              </div>
            ))}
          </div>

          <div className="map-frame">
            <iframe
              src={MAP_EMBED}
              width="100%"
              height="210"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              title="Dasatha Institute on Google Maps"
            />
          </div>
          <a className="btn btn-soft btn-block" href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" style={{ marginTop: 12 }}>
            <Icon name="search" size={16} /> Get directions to the institute
          </a>
          <p className="cc-foot">
            For class inquiries, contact the institute — or message the teacher for more details.
          </p>
        </div>

        <div className="card class-card">
          <div className="cc-head">
            <div className="cc-ic">
              <Icon name="bolt" size={20} />
            </div>
            <div>
              <div className="cc-title">Individual classes</div>
              <div className="cc-sub">Private tuition, one-on-one</div>
            </div>
          </div>

          <div className="sub-list">
            <div className="sub-row">
              <span className="sub-tag">O/L</span>
              <span>
                <b>Science</b>
                <small>English / Sinhala medium</small>
              </span>
            </div>
            <div className="sub-row">
              <span className="sub-tag">A/L</span>
              <span>
                <b>Physics</b>
                <small>Sinhala medium</small>
              </span>
            </div>
          </div>

          <p className="cc-note">
            Classes are arranged <b>within Colombo</b>. Group classes are also possible — discuss
            it with the teacher and we&apos;ll figure out the best fit.
          </p>

          <div className="cc-phone">
            <a href="tel:+94758660367" title="Call">
              <Icon name="phone" size={16} />
            </a>
            <a href="https://wa.me/94758660367" title="WhatsApp" target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon size={16} />
            </a>
            <a href="tel:+94758660367">075 866 0367</a>
          </div>

          <ContactTeacher />
        </div>
      </div>
    </section>
  );
}