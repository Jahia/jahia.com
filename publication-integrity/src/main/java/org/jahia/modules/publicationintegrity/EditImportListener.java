package org.jahia.modules.publicationintegrity;

import javax.jcr.observation.Event;
import javax.jcr.observation.EventIterator;
import org.jahia.services.content.DefaultEventListener;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

@Component(service = DefaultEventListener.class, immediate = true)
public class EditImportListener extends DefaultEventListener {
    @Reference private PublicationIntegrity integrity;
    public EditImportListener() {
        setWorkspace("default"); setAvailableDuringPublish(false);
        propertiesToIgnore.removeAll(java.util.Arrays.asList("j:published", "j:lastPublished", "j:lastPublishedBy", "j:liveProperties"));
    }
    @Override public String getPath() { return "/sites"; }
    @Override public int getEventTypes() { return Event.NODE_ADDED | Event.PROPERTY_ADDED | Event.PROPERTY_CHANGED | Event.PROPERTY_REMOVED; }
    @Override public void onEvent(EventIterator events) {
        while (events.hasNext()) { try { Event event = events.nextEvent();
            String path = event.getPath();
            if (event.getType() == Event.NODE_ADDED || PublicationIntegrity.metadataProperty(path.substring(path.lastIndexOf('/') + 1))) integrity.changed(path); }
            catch (javax.jcr.RepositoryException error) { org.slf4j.LoggerFactory.getLogger(getClass()).warn("Cannot read publication-integrity event", error); } }
    }
}
