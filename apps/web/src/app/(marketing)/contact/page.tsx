import type { Metadata } from "next";
import { MapPin, Phone, Mail, MessageCircle, Clock } from "lucide-react";
import { cn } from "@the-rooms/ui";

export const metadata: Metadata = {
  title: "Contact & Location",
  description: "Find The Rooms hotel on MG Road, Bangalore. Contact us via phone, WhatsApp, or email. View map and directions.",
};

export default function ContactPage() {
  return (
    <div className="pt-20">
      {/* Header */}
      <div className="bg-primary text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">Contact & Location</h1>
          <p className="text-white/70 text-lg max-w-2xl">
            Get in touch or visit us. We&apos;re always happy to welcome you.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="font-heading text-xl font-bold text-primary mb-6">Get in Touch</h2>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary text-sm mb-0.5">Address</h3>
                    <p className="text-muted text-sm">
                      The Rooms Hotel<br />
                      42, MG Road, Near Brigade Road<br />
                      Bangalore, Karnataka 560001
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary text-sm mb-0.5">Phone</h3>
                    <a href="tel:+919876543210" className="text-secondary text-sm hover:underline">
                      +91 98765 43210
                    </a>
                    <p className="text-xs text-muted mt-0.5">Available 24/7</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary text-sm mb-0.5">Email</h3>
                    <a href="mailto:hello@therooms.in" className="text-secondary text-sm hover:underline">
                      hello@therooms.in
                    </a>
                    <p className="text-xs text-muted mt-0.5">Response within 2 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary text-sm mb-0.5">WhatsApp</h3>
                    <a
                      href="https://wa.me/919876543210"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary text-sm hover:underline"
                    >
                      Chat with us on WhatsApp
                    </a>
                    <p className="text-xs text-muted mt-0.5">Fastest way to reach us</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary text-sm mb-0.5">Reception Hours</h3>
                    <p className="text-muted text-sm">24 hours, 7 days a week</p>
                    <div className="mt-2 text-xs space-y-0.5">
                      <div className="flex justify-between max-w-[200px]">
                        <span>Check-in</span><span className="font-medium">From 2:00 PM</span>
                      </div>
                      <div className="flex justify-between max-w-[200px]">
                        <span>Check-out</span><span className="font-medium">By 11:00 AM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Contact CTA */}
            <div className="bg-secondary rounded-2xl p-6 text-white">
              <h3 className="font-heading font-bold text-lg mb-2">Have a booking question?</h3>
              <p className="text-white/70 text-sm mb-4">
                Our front desk is staffed 24/7. Call us or send a WhatsApp message for instant support.
              </p>
              <div className="flex gap-3">
                <a
                  href="tel:+919876543210"
                  className="flex-1 py-2.5 bg-white text-secondary font-semibold text-sm rounded-lg text-center hover:bg-white/90 transition-colors"
                >
                  Call Now
                </a>
                <a
                  href="https://wa.me/919876543210"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-[#25D366] text-white font-semibold text-sm rounded-lg text-center hover:bg-[#25D366]/90 transition-colors"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border">
              <div className="aspect-[4/3] relative">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.1!2d77.6089!3d12.9753!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDU4JzMzLjkiTiA3N8KwMzYnMzIuMCJF!5e0!3m2!1sen!2sin!4v1700000000000"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="The Rooms Hotel Location"
                  className="absolute inset-0"
                />
              </div>
            </div>
            <div className="bg-accent/30 rounded-2xl p-5">
              <h3 className="font-heading font-semibold text-primary mb-2">Getting Here</h3>
              <ul className="space-y-2 text-sm text-muted">
                <li><span className="font-medium text-primary">🚆 Nearest Metro:</span> MG Road Station (500m)</li>
                <li><span className="font-medium text-primary">✈️ Airport:</span> Kempegowda International Airport (35 km)</li>
                <li><span className="font-medium text-primary">🚗 Parking:</span> Free on-site parking available</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
